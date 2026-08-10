# IsiVoltPro OT — OT-05 · Auditoría y decisión de Sistema técnico v1

Fecha: 2026-08-10
Rama: `feat/ot-technical-systems-v1`
Estado: **ALCANCE FIJADO — ANTES DE SQL**

## 1. Resultado de MOV-088 — esquema actual

Tras OT-04, el modelo operativo efectivo sigue siendo:

`CLIENTE → INSTALACIÓN → UBICACIÓN opcional → ACTIVO opcional → OT`

No existe en `main`:

- tabla `sistemas_instalacion`;
- `sistema_id` en activos;
- `sistema_id` en órdenes de trabajo.

La capa de ubicaciones ya está resuelta y gestionable desde la ficha de instalación.

## 2. Resultado de MOV-089 — creación de OT

La aplicación real utiliza una única función frontend:

`createWorkOrder()`

que llama a:

`supabase.rpc('create_work_order', ...)`.

La firma actual recibe contexto de:

- tenant;
- instalación;
- ubicación opcional;
- activo opcional;
- técnico opcional;
- datos de trabajo;
- planificación;
- requisitos de cierre.

No existe `system_uuid`.

### Riesgo

Añadir `sistema_id` a OT en la primera migración de OT-05 obligaría a modificar y volver a validar simultáneamente:

- SQL de la tabla OT;
- firma RPC;
- `CreateWorkOrderInput`;
- formulario rápido;
- formulario avanzado;
- demo/tests;
- compatibilidad de llamadas existentes.

Eso rompe el objetivo de una primera versión pequeña.

## 3. Resultado de MOV-090 — antigua PR #31

La PR histórica proponía una solución amplia que agrupaba:

- tabla de sistemas;
- 21 especialidades;
- campos adicionales de instalaciones;
- referencias desde activos y OT;
- especialidades de técnicos;
- normativa y datos técnicos;
- backfills;
- cambios de checklist;
- `create_work_order_v2`.

### Conceptos que sí se conservan

- el sistema pertenece a una instalación;
- debe tener soft delete;
- debe respetar tenant isolation;
- debe poder activarse/desactivarse;
- la relación futura con OT/activo será opcional;
- no se debe borrar histórico al retirar un sistema.

### Conceptos descartados para v1

- catálogo cerrado de 21 especialidades;
- especialidades por técnico;
- normativa estructurada;
- JSON técnico;
- backfills automáticos;
- RPC v2;
- cambios simultáneos en checklist/activos/OT.

## 4. MOV-091 — decisión

**Opción A: tabla de sistemas únicamente, sin enlazar todavía OT ni activos.**

OT-05 v1 creará el maestro contextual:

`INSTALACIÓN → SISTEMAS TÉCNICOS`

La UI permitirá documentar qué sistemas existen en una instalación, pero no obligará a elegir uno al crear una OT.

## 5. Motivos

1. Aporta valor inmediato a instalaciones nuevas y antiguas.
2. No cambia `create_work_order`.
3. No afecta OT rápida.
4. No afecta activos existentes.
5. No necesita backfill.
6. Puede probarse con una sola tabla aislada.
7. Permite recoger datos reales antes de decidir taxonomías complejas.
8. Prepara una futura relación opcional con OT/activos sin imponerla prematuramente.

## 6. MOV-092 — contrato de dominio v1

Tabla propuesta:

`public.sistemas_instalacion`

Campos mínimos:

- `id uuid`;
- `tenant_id uuid`;
- `instalacion_id uuid`;
- `nombre text` obligatorio;
- `codigo text` opcional;
- `tipo text` opcional y libre;
- `criticidad text` con `baja | media | alta | critica`;
- `descripcion text` opcional;
- `estado text` con `activo | inactivo`;
- `created_at`;
- `updated_at`;
- `deleted_at`.

### Decisión sobre ubicación

**No se añade `ubicacion_id` en v1.**

Motivo:

un sistema puede abarcar varias zonas —por ejemplo climatización de una planta, red PCI o distribución eléctrica— y ligar sistema a una sola ubicación obligaría demasiado pronto a definir cardinalidad.

La relación sistema↔ubicación se auditará después si aparece una necesidad real.

## 7. Índices/identidad

Previstos:

- índice `(tenant_id, instalacion_id, estado)`;
- índice `(tenant_id, instalacion_id)`;
- código opcional único dentro de la instalación mientras el registro no esté borrado.

No se impone nombre único porque pueden existir denominaciones repetidas legítimas.

## 8. RLS v1

Lectura:

`has_tenant_access(tenant_id)`

Gestión:

`can_manage_work_orders(tenant_id)`

No habrá política DELETE.

El borrado físico no formará parte de la API frontend.

## 9. FK v1

- `tenant_id` → `tenants(id)`;
- `instalacion_id` → `instalaciones(id)` con histórico preservado.

Además de la FK simple, la migración/repository debe impedir que se cree un sistema bajo un `tenant_id` distinto al de la instalación.

La estrategia exacta se fija en MOV-093 antes de SQL.

## 10. Capability frontend prevista

`installations.systems.manage`

Permitida inicialmente a:

- `admin_cliente`;
- `coordinador`.

Denegada a técnico/externo/lectura/desconocido.

## 11. Qué NO hace OT-05 v1

- no añade sistema a OT;
- no añade sistema a activo;
- no modifica `create_work_order`;
- no modifica OT rápida;
- no crea `create_work_order_v2`;
- no hace backfill;
- no crea especialidades de técnicos;
- no clasifica automáticamente sistemas existentes.

## 12. Fase posterior prevista

Una vez que `sistemas_instalacion` esté estable y se haya usado con datos reales, la siguiente fase decidirá por separado:

1. relación opcional `activo → sistema`;
2. relación opcional `OT → sistema`;
3. cómo evolucionar `create_work_order` manteniendo compatibilidad;
4. si hace falta relación sistema↔ubicaciones de muchos-a-muchos.

Nada de eso se anticipa en OT-05 v1.
