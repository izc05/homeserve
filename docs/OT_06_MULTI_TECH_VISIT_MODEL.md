# IsiVoltPro OT — OT-06 · Modelo de múltiples técnicos, visitas y relevo

Fecha: 2026-08-10
Estado: **DISEÑO APROBADO PARA IMPLEMENTACIÓN V1**

## 1. Frontera con IsiVoltPro Platform

OT-06 no crea un nuevo sistema de usuarios.

### FROM PLATFORM / identidad futura

- organization/user/member;
- usuario técnico activo;
- acceso global a la aplicación OT.

### OWNED BY OT

- quién participa en una OT;
- quién es responsable de esa OT;
- colaboradores;
- visitas/intervenciones;
- relevo;
- cierre técnico;
- auditoría operativa.

Mientras OT siga sobre Supabase, `profiles`/`tenant_members` son la compatibilidad actual. El modelo se diseña para poder sustituir esas referencias por IDs compartidos de Platform posteriormente.

## 2. Decisión principal

No se sustituye:

`ordenes_trabajo.assigned_to`

por un array.

`assigned_to` seguirá significando:

> técnico responsable principal de la OT.

Se añade una relación normalizada:

`ot_participantes`

para representar responsable y colaboradores.

## 3. Tabla `ot_participantes` V1

Campos previstos:

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | obligatorio |
| `ot_id` | uuid | obligatorio |
| `tecnico_id` | uuid | obligatorio |
| `rol` | text | `responsable` / `colaborador` |
| `estado` | text | `activo` / `retirado` |
| `added_by` | uuid | actor que añadió |
| `added_at` | timestamptz | alta |
| `removed_by` | uuid nullable | actor retirada |
| `removed_at` | timestamptz nullable | retirada |
| `motivo` | text nullable | alta/retiro/relevo |
| `created_at` | timestamptz | auditoría |
| `updated_at` | timestamptz | auditoría |

No habrá DELETE físico desde la API normal.

## 4. Invariantes

### 4.1 Un participante activo por OT+técnico

No puede haber dos relaciones activas simultáneas del mismo técnico en una OT.

Índice parcial previsto:

```text
UNIQUE tenant_id + ot_id + tecnico_id
WHERE estado = 'activo'
```

### 4.2 Un responsable activo

Solo puede existir un participante activo con rol `responsable` por OT.

Índice parcial previsto:

```text
UNIQUE tenant_id + ot_id
WHERE rol = 'responsable' AND estado = 'activo'
```

### 4.3 Responsable ↔ `assigned_to`

Mientras exista la columna legacy:

```text
ordenes_trabajo.assigned_to
=
ot_participantes.tecnico_id del responsable activo
```

Esta coherencia se impondrá en servidor.

### 4.4 Técnico válido

Un participante nuevo debe ser miembro activo del tenant con rol técnico permitido:

- `tecnico`;
- `tecnico_externo`.

No basta con que exista en `profiles`.

### 4.5 Tenant coherente

La OT y participante deben pertenecer al mismo tenant.

## 5. Bootstrap de OTs existentes

Al introducir la tabla:

- OT con `assigned_to IS NULL` → sin participante responsable;
- OT con `assigned_to` → crear participante `responsable + activo`;
- no se cambia `assigned_to`;
- no se reescribe historial de visitas;
- no se altera estado de OT.

El backfill debe ser idempotente y tenant-safe.

## 6. Participantes y ejecución

### Responsable

Puede:

- aceptar la OT;
- iniciar su visita;
- ejecutar tareas;
- cerrar su visita;
- coordinar cierre técnico final;
- realizar relevo cuando la política final lo permita.

### Colaborador

Puede:

- ver la OT si participa activamente;
- iniciar su propia visita cuando el estado operativo lo permita;
- registrar evidencias/trabajo según permisos de ejecución;
- cerrar su propia visita.

No puede por el mero hecho de ser colaborador:

- validar administrativamente;
- cancelar la OT;
- cambiar cliente/instalación/activo;
- asignar participantes arbitrariamente;
- enviar por sí solo la OT a revisión final.

## 7. Visitas

Se reutiliza:

`ot_visitas`

No se crea una tabla alternativa.

Cada visita pertenece a:

- una OT;
- un técnico.

Una OT puede tener:

- varias visitas del mismo técnico en momentos distintos;
- visitas de distintos técnicos;
- varias visitas activas simultáneamente de técnicos diferentes si la operación lo requiere.

## 8. Invariante de visita activa

V1 propuesta:

> máximo una visita `EN_CURSO` por OT+técnico.

No se impone máximo una visita activa por OT globalmente.

Esto permite:

```text
OT-123
├── Carlos · visita EN_CURSO
└── Miguel · visita EN_CURSO
```

pero impide:

```text
OT-123
├── Carlos · visita A EN_CURSO
└── Carlos · visita B EN_CURSO
```

## 9. Separación cierre visita / cierre OT

### Cerrar mi visita

Debe:

- finalizar solo la visita del actor;
- guardar trabajo realizado;
- diagnóstico;
- pruebas;
- recomendaciones;
- trabajo pendiente;
- próxima acción;
- resultado;
- fecha fin;
- auditoría.

Debe dejar la OT operativamente abierta salvo que se ejecute además el cierre técnico final.

### Finalizar OT

Acción distinta, normalmente del responsable.

Debe comprobar:

1. OT en estado válido;
2. responsable actual;
3. ninguna visita activa pendiente;
4. requisitos globales de cierre;
5. resumen técnico final;
6. pasar a `FINALIZADA_TECNICO`;
7. enviar después a revisión administrativa.

## 10. Compatibilidad de `finalize_active_work_order_visit`

La RPC legacy actualmente hace dos cosas a la vez:

1. finaliza visita;
2. finaliza OT.

No se eliminará bruscamente.

Estrategia V1:

- añadir una RPC explícita para cerrar visita individual;
- endurecer la RPC legacy para que solo el responsable pueda usar la ruta de cierre final y no existan otras visitas activas;
- migrar frontend a acciones separadas;
- deprecar semánticamente la ruta legacy para una futura versión.

## 11. Corrección administrativa

Flujo deseado:

```text
FINALIZADA_TECNICO
      ↓
corrección solicitada
      ↓
EN_CURSO
      ↓
nueva visita
      ↓
cerrar visita
      ↓
finalizar OT
      ↓
FINALIZADA_TECNICO
```

Nunca se reabre/modifica una visita ya finalizada.

## 12. Relevo

El relevo es un cambio de responsabilidad, no un borrado.

Debe conservar:

- responsable saliente en histórico;
- visitas del saliente;
- observaciones/relevo;
- responsable entrante;
- auditoría del cambio;
- OT y evidencias intactas.

### Resultado conceptual

Antes:

```text
responsable: Carlos
colaborador: Miguel
```

Después de relevo a Miguel:

```text
responsable: Miguel
Carlos: retirado o colaborador según la decisión del relevo
```

`assigned_to` pasa a Miguel.

## 13. Política de relevo V1

La primera implementación será conservadora:

- manager puede hacer relevo;
- el responsable actual podrá recibir una capacidad de relevo técnico solo tras pruebas específicas de seguridad;
- nunca un colaborador cualquiera podrá autoproclamarse responsable.

## 14. Estados globales de OT

OT-06 no crea estados nuevos innecesariamente.

Se conservan:

- BORRADOR;
- ASIGNADA;
- ACEPTADA;
- EN_CURSO;
- BLOQUEADA;
- FINALIZADA_TECNICO;
- VALIDADA;
- CANCELADA.

El detalle de quién está trabajando se obtiene de participantes + visitas, no añadiendo estados por técnico.

## 15. Bloqueos

OT-06 no rediseña todavía los motivos de bloqueo.

Eso queda para OT-07.

Sin embargo, una visita debe poder cerrarse dejando `trabajo_pendiente` sin obligar a finalizar la OT.

## 16. RLS y seguridad

Reglas objetivo:

- manager: gestión de participantes;
- participante activo: lectura de OT/participantes y ejecución según rol;
- no participante técnico: sin acceso a la OT salvo otra regla explícita;
- cliente lectura: mantiene su alcance actual;
- mutaciones sensibles mediante RPC/invariantes de servidor;
- sin DELETE físico normal de participantes/visitas.

## 17. Frontend objetivo

### Responsable y equipo

Ficha OT:

```text
Equipo técnico
Responsable   Carlos Martínez
Colaborador   Miguel López
Colaborador   Ana Ruiz
```

### Visitas

```text
Visita 1 · Carlos · 08:02–09:14 · Finalizada
Visita 2 · Miguel  · 08:20–10:01 · Finalizada
Visita 3 · Carlos · 12:15–...   · En curso
```

### Acciones del técnico

- Iniciar mi visita;
- Cerrar mi visita;
- registrar evidencias;
- ver trabajo pendiente/relevo.

### Acción responsable

- Finalizar OT y enviar a revisión.

## 18. Decisiones explícitamente descartadas

No usar:

- `technician_ids uuid[]` en `ordenes_trabajo`;
- duplicar `ot_visitas`;
- una OT distinta por cada técnico colaborador;
- cerrar toda la OT al cerrar cualquier visita;
- borrar participantes para hacer un relevo;
- crear usuarios dentro de OT;
- modificar Platform/PocketBase desde esta fase.

## 19. Secuencia de implementación

1. `ot_participantes` + invariantes + bootstrap.
2. pgTAP.
3. sincronización responsable / `assigned_to`.
4. `can_execute_work_order` basado en participante activo.
5. ciclo multi-visita.
6. cierre individual.
7. cierre final responsable.
8. corrección/nueva visita.
9. relevo.
10. repositories.
11. UI equipo.
12. UI visitas.
13. UI relevo.
14. Quality + Supabase Quality.
15. PR Ready.
