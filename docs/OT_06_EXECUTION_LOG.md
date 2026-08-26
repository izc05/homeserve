# IsiVoltPro OT — OT-06 · Múltiples técnicos, visitas y relevo

Fecha de inicio: 2026-08-10
Rama: `feat/ot-multi-technician-visits-v1`
Base exacta: `main` @ `4605843d4b605cf4fa14b7e133ec79740fe1e140`
Estado: **EN CURSO — AUDITORÍA Y DISEÑO**

## 1. Objetivo

Permitir que una orden de trabajo tenga:

- un técnico responsable;
- cero o varios técnicos colaboradores;
- varias visitas/intervenciones;
- visitas simultáneas de distintos técnicos cuando proceda;
- cierre individual de cada visita;
- cierre técnico final de la OT separado del cierre de una visita;
- relevo de responsable con trazabilidad;
- correcciones administrativas que puedan generar nuevas visitas sin romper el ciclo de vida.

## 2. Principio funcional

```text
OT
├── responsable
├── colaboradores
├── visita A · técnico 1
├── visita B · técnico 2
├── visita C · técnico 1
└── cierre técnico final
```

Regla central:

> Una visita pertenece a una OT, pero finalizar una visita no debe significar necesariamente finalizar toda la OT.

## 3. Compatibilidad a preservar

- `ordenes_trabajo.assigned_to` se mantiene como técnico responsable principal.
- No se elimina ninguna visita histórica.
- No se rompe la firma ni el histórico de auditoría sin una migración explícita.
- `ot_visitas` se reutiliza; no se crea una segunda tabla de visitas.
- RLS/RPC siguen siendo la autoridad real.
- La UI no decide permisos de servidor.
- No se toca IsiVoltPro Platform ni PocketBase en esta fase.
- No se despliega al mini PC ni producción durante el desarrollo.

## 4. Auditoría inicial

### MOV-076 — Merge OT-05

**Estado:** COMPLETADO.

PR #48 fusionada mediante Squash & Merge.

Nuevo `main`:

`4605843d4b605cf4fa14b7e133ec79740fe1e140`

### MOV-077 — Verificar main

**Estado:** COMPLETADO.

GitHub confirma que `main` apunta exactamente al commit squash de OT-05.

### MOV-078 — Crear rama OT-06

**Estado:** COMPLETADO.

Rama:

`feat/ot-multi-technician-visits-v1`

Base:

`4605843d4b605cf4fa14b7e133ec79740fe1e140`

### MOV-079 — Auditar modelo de visitas existente

**Estado:** COMPLETADO.

La tabla `ot_visitas` ya contiene:

- `tenant_id`;
- `ot_id`;
- `tecnico_id`;
- estado;
- inicio/fin;
- trabajo realizado;
- diagnóstico;
- pruebas;
- recomendaciones;
- trabajo pendiente;
- motivo de cierre;
- próxima acción;
- estado final del activo;
- resultado de cierre;
- firma/relaciones de evidencias según evolución del esquema.

Conclusión:

**se reutiliza `ot_visitas`; no se crea otra tabla de intervenciones.**

### MOV-080 — Auditar ciclo técnico vigente

**Estado:** COMPLETADO.

Hallazgos:

1. `can_execute_work_order()` exige actualmente `assigned_to = auth.uid()`.
2. `start_work_order_visit()` solo permite al técnico asignado iniciar desde `ACEPTADA`.
3. La UI técnica filtra por `assignedTo === viewerId`.
4. `finalize_active_work_order_visit()` cierra la visita y cambia inmediatamente la OT a `FINALIZADA_TECNICO`.
5. `review_work_order(..., correccion_solicitada, ...)` devuelve la OT a `EN_CURSO`.
6. Tras esa corrección ya no existe visita activa, pero `start_work_order_visit()` no permite abrir otra desde `EN_CURSO`.

Conclusión:

El modelo actual funciona para **una OT = un técnico = una visita principal**, pero no para múltiples visitas/relevos.

### MOV-081 — Auditar asignación vigente

**Estado:** COMPLETADO.

`assign_work_order()`:

- mantiene un único `assigned_to`;
- registra auditoría detallada;
- permite asignar/reasignar solo en `BORRADOR`/`ASIGNADA`;
- no permite relevo después de aceptación/inicio.

Decisión:

- conservar `assigned_to` como responsable principal;
- no sustituirlo por un array;
- añadir un modelo relacional de participantes.

## 5. Movimientos futuros OT-06

### MOV-082 — Cerrar modelo de participantes

Definir `ot_participantes`:

- tenant;
- OT;
- técnico;
- rol en OT;
- estado de participación;
- quién lo añadió;
- fechas de alta/baja;
- motivo.

Debe soportar responsable y colaboradores sin borrar historial.

### MOV-083 — Diseñar índices e invariantes

Como mínimo:

- máximo un participante activo por OT+técnico;
- máximo un responsable activo por OT;
- técnico debe ser miembro activo del tenant;
- ninguna relación cross-tenant;
- `assigned_to` y responsable activo deben permanecer coherentes.

### MOV-084 — Migración aditiva participantes v1

Crear tabla, RLS, índices y bootstrap compatible para OTs existentes con `assigned_to`.

No se borrará ni reescribirá `assigned_to`.

### MOV-085 — pgTAP participantes

Cubrir:

- aislamiento tenant;
- responsable único;
- colaborador;
- técnico inactivo rechazado;
- duplicado activo rechazado;
- historial preservado;
- técnico ajeno rechazado.

### MOV-086 — Ampliar `can_execute_work_order`

El permiso técnico pasará de:

`assigned_to = auth.uid()`

a:

`participante activo de la OT`.

`assigned_to` seguirá identificando al responsable.

### MOV-087 — Ciclo de visita individual

Modificar/incluir RPC para permitir:

- iniciar visita propia;
- una visita activa por técnico y OT;
- varias visitas históricas por técnico;
- varias visitas simultáneas de técnicos distintos cuando la OT esté en curso.

### MOV-088 — Separar cierre de visita y cierre de OT

Crear una acción de cierre de **mi visita** que:

- guarda trabajo realizado;
- diagnóstico;
- pruebas;
- recomendaciones;
- pendientes;
- resultado;
- fecha fin;
- NO envía automáticamente la OT a revisión.

### MOV-089 — Cierre técnico final de OT

Crear acción separada para el responsable:

- exige que no queden visitas activas;
- verifica requisitos de cierre;
- consolida resumen técnico;
- cambia a `FINALIZADA_TECNICO`;
- mantiene auditoría.

El comportamiento legacy `finalize_active_work_order_visit()` se adaptará o envolverá de forma compatible; no se dejará una vía insegura para que un colaborador cierre toda la OT.

### MOV-090 — Corrección administrativa / nueva visita

Cuando administración solicita corrección:

- OT vuelve a `EN_CURSO`;
- responsable/participantes pueden iniciar una nueva visita;
- no se reutiliza una visita ya finalizada;
- queda historial completo de cada ciclo.

### MOV-091 — Relevo de responsable

Diseñar RPC específica de relevo:

- responsable saliente;
- responsable entrante;
- nota obligatoria;
- actualización coherente de `assigned_to`;
- participantes;
- auditoría;
- visitas históricas intactas.

La política de quién puede ejecutar el relevo se validará antes de codificar: manager y/o responsable actual según riesgo.

### MOV-092 — Repository frontend de participantes/visitas

Añadir tipos y APIs sin acoplar UI directamente a tablas.

### MOV-093 — UI responsable + colaboradores

En ficha de OT:

- responsable visible;
- colaboradores visibles;
- añadir/quitar colaborador según capability;
- historial de participación.

### MOV-094 — Zona técnico multi-participante

`Mis OT` debe incluir OTs donde el usuario sea participante activo, no solo `assigned_to`.

Distinguir visualmente:

- Responsable;
- Colaborador.

### MOV-095 — UI de visitas

Mostrar:

- visitas históricas;
- técnico;
- inicio/fin;
- duración;
- trabajo;
- estado;
- visita activa propia;
- otras visitas activas de compañeros en modo informativo.

### MOV-096 — UI cerrar mi visita

Botón separado de `Finalizar OT`.

### MOV-097 — UI finalización responsable

Solo responsable/capability correspondiente puede enviar la OT a revisión administrativa.

### MOV-098 — UI relevo

Flujo explícito:

1. seleccionar técnico entrante;
2. escribir resumen/relevo;
3. confirmar;
4. actualizar responsable;
5. conservar técnico saliente como histórico y opcionalmente colaborador según contrato.

### MOV-099 — Tests frontend

Paridad de:

- responsable;
- colaborador;
- no participante;
- manager;
- visita propia;
- cierre individual;
- cierre final;
- relevo.

### MOV-100 — Supabase Quality

Ejecutar desde cero:

- start;
- db reset;
- db lint;
- pgTAP completo;
- stop.

### MOV-101 — Quality frontend

- branding;
- typecheck;
- lint;
- Vitest;
- build.

### MOV-102 — Revisión global

Comprobar:

- diff;
- RLS;
- ACL de funciones;
- auditoría;
- ausencia de ampliaciones accidentales;
- compatibilidad con `assigned_to`;
- ausencia de cambios Platform/mini PC/producción.

### MOV-103 — PR Ready

Solo con Quality + Supabase Quality verdes sobre el mismo HEAD.

### MOV-104 — Squash & Merge

Solo tras revisión explícita.

### MOV-105 — Preparar OT-07

OT-07 prevista: bloqueos operativos + motivos estructurados + SLA, salvo que OT-06 revele una dependencia más prioritaria.

## 6. Estado de seguridad

En este momento OT-06 solo contiene auditoría/documentación.

No se ha creado:

- tabla nueva;
- migración nueva;
- RPC nueva;
- cambio RLS;
- cambio frontend;
- despliegue;
- cambio en mini PC;
- cambio en Platform.
