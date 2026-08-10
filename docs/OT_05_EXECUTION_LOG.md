# IsiVoltPro OT — OT-05 · Sistema técnico v1

Fecha de inicio: 2026-08-10
Rama: `feat/ot-technical-system-v1`
Base exacta: `main` @ `49f918b19600477ca837620f068281cc2c9458db`
Estado: **EN AUDITORÍA / DISEÑO**

## 1. Objetivo

Introducir el concepto mínimo de **sistema técnico** dentro de una instalación para poder clasificar una OT por el sistema afectado sin obligar a registrar un activo.

Ejemplos:

- Electricidad BT;
- Climatización y ventilación;
- PCI;
- Fontanería/ACS;
- Gases medicinales;
- Telecomunicaciones;
- Automatización;
- Sistema general.

Principio de producto:

> Una OT puede conocer el sistema técnico afectado aunque todavía no conozcamos el activo exacto.

Y también:

> El sistema técnico debe seguir siendo opcional para abrir una OT.

## 2. Base real auditada

El esquema actual ya dispone de:

`cliente → instalación → ubicación → activo → OT`

`ubicación` y `activo` son opcionales en la OT.

El catálogo actual de creación de OT carga:

- clientes;
- instalaciones;
- ubicaciones;
- activos;
- técnicos.

No existe una entidad de sistema técnico en `main`.

## 3. Propuesta histórica PR #31

Se revisa exclusivamente como referencia.

La propuesta antigua incluía en un único bloque:

- catálogo global de 21 especialidades;
- nuevos campos sector/riesgo en instalaciones;
- tabla `sistemas_instalacion`;
- sistema `GENERAL` automático en todas las instalaciones;
- backfill de todos los activos al sistema general;
- `sistema_id` + especialidad + normativa en OT;
- especialidad en checklists;
- múltiples especialidades por técnico;
- nuevos índices/RLS;
- migraciones posteriores de creación OT v2.

### Decisión OT-05

**NO reutilizar esa migración.**

Razones:

1. mezcla demasiados dominios;
2. introduce catálogo técnico global antes de necesitarlo;
3. realiza backfill automático innecesario;
4. hace evolucionar activos, técnicos, checklists y OT simultáneamente;
5. aumenta mucho el riesgo de compatibilidad.

## 4. Modelo mínimo OT-05 v1

Entidad propuesta:

`public.sistemas_instalacion`

Campos mínimos previstos:

- `id uuid`;
- `tenant_id uuid`;
- `instalacion_id uuid`;
- `nombre text`;
- `codigo text null`;
- `especialidad text` con valor inicial libre/controlado por UI, default `general`;
- `descripcion text null`;
- `criticidad text` (`baja|media|alta|critica`);
- `estado text` (`activo|fuera_servicio|inactivo`);
- `created_by uuid`;
- `created_at`;
- `updated_at`;
- `deleted_at`.

### Lo que NO tendrá v1

- tabla global `especialidades_tecnicas`;
- normativa como array;
- sector/riesgo nuevo en instalación;
- especialidades por técnico;
- backfill de sistemas;
- sistema `GENERAL` automático;
- borrado físico;
- relación sistema ↔ ubicación obligatoria.

Un sistema puede abarcar varias zonas de una instalación, por lo que no se le fuerza una única `ubicacion_id`.

## 5. Relaciones previstas

### Instalación

Obligatoria:

`instalación 1 → N sistemas`

### Activo

Relación futura/segundo bloque de OT-05:

`activo → sistema_id NULLABLE`

Nunca obligatorio.

### Orden de trabajo

Relación futura/segundo bloque de OT-05:

`OT → sistema_id NULLABLE`

Nunca obligatorio.

La OT rápida debe seguir pudiendo crearse con:

- instalación;
- problema;
- prioridad;

sin ubicación, sistema ni activo.

## 6. Seguridad prevista

Si se crea la tabla:

### Lectura

`public.has_tenant_access(tenant_id)`

### Gestión

`public.can_manage_work_orders(tenant_id)`

Debe mantener la semántica operativa usada actualmente para ubicaciones.

### UI capability prevista

`installations.systems.manage`

Compatibilidad esperada:

- `admin_cliente`: sí;
- `coordinador`: sí;
- `tecnico`: no;
- `tecnico_externo`: no;
- `cliente_lectura`: no;
- desconocido: no.

## 7. Estrategia por subfases

### OT-05A — Auditoría y contrato

MOV-057 a MOV-060.

Sin DB.

### OT-05B — Tabla mínima de sistemas

Migración aditiva nueva.

Solo tabla/RLS/índices/trigger y tests SQL.

No modificar `activos` ni `ordenes_trabajo` todavía.

### OT-05C — UI de sistemas dentro de instalación

Panel similar conceptualmente a ubicaciones:

- listar;
- crear;
- editar;
- activar/desactivar;
- sin borrado físico.

### OT-05D — Sistema opcional en activos

Solo si la fase anterior queda validada.

`activos.sistema_id NULL`.

No backfill.

### OT-05E — Sistema opcional en OT

Añadir `ordenes_trabajo.sistema_id NULL` y extender de forma compatible la creación de OT.

No romper OT rápida.

### OT-05F — Historia/detalle

Mostrar sistema vinculado en:

- ficha OT;
- listado/búsqueda si procede;
- histórico del activo.

## 8. Movimientos

### MOV-057 — Crear rama

**COMPLETADO**.

`feat/ot-technical-system-v1`

desde `main` `49f918b19600477ca837620f068281cc2c9458db`.

### MOV-058 — Auditar esquema real

**COMPLETADO**.

Confirmado:

- no existe tabla de sistemas en `main`;
- `instalaciones`, `ubicaciones`, `activos` y `ordenes_trabajo` ya existen;
- ubicación y activo son opcionales en OT.

### MOV-059 — Auditar catálogo creación OT

**COMPLETADO**.

`loadWorkOrderCreationCatalog()` carga clientes, instalaciones, ubicaciones, activos y técnicos.

No existe sistema técnico.

### MOV-060 — Revisar PR #31 como referencia

**COMPLETADO**.

Decisión: no copiar migración masiva.

### MOV-061 — Cerrar contrato de sistema v1

Revisar este documento y crear `OT_05_AUDIT_DECISION.md` con decisión final de tabla/campos/seguridad.

### MOV-062 — Diseñar migración OT-05B

Crear migración nueva e independiente.

No aplicar a producción.

### MOV-063 — Tests SQL de sistema técnico

Comprobar:

- tenant isolation;
- lectura;
- gestión admin/coordinador;
- rechazo técnico/lectura;
- instalación de otro tenant rechazada;
- código duplicado activo rechazado;
- código nulo permitido;
- estado/criticidad inválidos rechazados;
- soft delete no elimina físicamente.

### MOV-064 — Capability frontend

Añadir `installations.systems.manage` + tests.

### MOV-065 — Repository frontend

CRUD lógico tenant-safe:

- list;
- create;
- update;
- set active/inactive/out-of-service;
- no physical delete.

### MOV-066 — Panel UI sistema

Integrar en ficha de instalación.

### MOV-067 — CI intermedio OT-05B/C

Quality completo.

### MOV-068 — Decidir vínculo opcional activo

Solo después de validar sistema maestro.

### MOV-069 — Migración `activos.sistema_id NULL`

Si MOV-068 aprueba.

Sin backfill.

### MOV-070 — Extender catálogo activos/sistemas

Mantener compatibilidad.

### MOV-071 — Decidir vínculo opcional OT

Auditar `create_work_order` antes de tocar RPC.

### MOV-072 — Migración `ordenes_trabajo.sistema_id NULL`

Solo si el diseño de RPC compatible está cerrado.

### MOV-073 — Extender creación rápida y avanzada

Sistema opcional.

Nunca obligatorio.

### MOV-074 — Tests creación OT

Casos:

- sin sistema ✅;
- con sistema misma instalación ✅;
- sistema otro tenant ❌;
- sistema otra instalación ❌;
- activo sin sistema ✅;
- OT rápida sin activo/sistema ✅.

### MOV-075 — Revisión global / PR Draft

### MOV-076 — Quality final

### MOV-077 — Ready / revisión de mergeabilidad

### MOV-078 — Squash & Merge OT-05

Solo si todos los controles están verdes.

### MOV-079 — Preparar OT-06

Prevista: activos progresivos / descubrimiento en campo o planificación multi-técnico, según el estado real tras OT-05.

## 9. Restricciones de fase

- no tocar producción;
- no desplegar mini PC;
- no tocar Platform;
- no copiar PR #31;
- no crear catálogo global de especialidades;
- no hacer backfill automático;
- no obligar sistema en OT;
- no obligar activo en OT;
- no mezclar gestión de técnicos/checklists en esta fase.

## 10. Rollback esperado

Cada subfase debe ser reversible por commit/PR.

Si se llega a migración DB, debe ser aditiva y tener rollback documentado antes del merge.
