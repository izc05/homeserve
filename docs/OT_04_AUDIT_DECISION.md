# IsiVoltPro OT — OT-04 · Auditoría y decisión de alcance

Fecha: 2026-08-10
Rama: `feat/ot-installation-context`
Base: `main` @ `365f7423ff9143c33632f4f6fb1bb3e81e9bf6da`

## 1. Resultado de MOV-072 — modelo actual

### Cliente

Tabla `clientes` y módulo UI completos.

### Instalación

Tabla `instalaciones` ya existente con:

- tenant;
- cliente;
- nombre;
- código;
- tipo;
- dirección;
- descripción;
- contacto;
- estado;
- soft delete.

La ficha de cliente permite crear, editar y activar/desactivar instalaciones.

### Ubicación / zona

Tabla `ubicaciones` ya existente con:

- tenant;
- instalación;
- nombre;
- código;
- tipo;
- descripción;
- estado;
- soft delete.

Relaciones actuales:

- `activos.ubicacion_id` → `ubicaciones`;
- `ordenes_trabajo.ubicacion_id` → `ubicaciones`.

RLS actual:

- lectura: `has_tenant_access(tenant_id)`;
- gestión: `can_manage_work_orders(tenant_id)`.

El catálogo de creación de OT ya carga ubicaciones activas.

### Carencia encontrada

Aunque la tabla existe y las OT ya pueden usarla, la ficha de cliente/instalación **no permite ver ni administrar ubicaciones**.

Por tanto una parte importante de la jerarquía técnica ya existe en DB pero no está expuesta de forma útil en la UI.

### Activo

Tabla `activos` ya existente y vinculada a instalación + ubicación opcional.

Existe un workspace de activos/historial, aunque OT-01 retiró su navegación maestra dentro de OT para no convertir la aplicación en el maestro global de activos.

### Sistema técnico

`main` **no contiene** tabla `sistemas_instalacion`, campo `sistema_id` en OT ni especialidades multisector normalizadas.

## 2. Resultado de MOV-073 — PR #31 como referencia

La PR histórica #31 contiene una propuesta de sistemas técnicos, pero su migración agrupa demasiado alcance:

- 21 especialidades técnicas;
- campos nuevos de instalación;
- tabla `sistemas_instalacion`;
- referencias desde activos y OT;
- normativa;
- datos técnicos JSON;
- especialidades por técnico;
- backfill automático de sistemas generales;
- cambios de checklist;
- nueva RPC `create_work_order_v2`.

Esta solución no se copiará ni se continuará desde su rama.

### Conceptos aprovechables para el futuro

- sistema técnico pertenece a una instalación;
- sistema debe ser opcional en la OT;
- activo puede pertenecer a sistema;
- sistema puede tener especialidad y criticidad;
- soft delete + FK restrict para preservar histórico;
- validación tenant + instalación.

## 3. MOV-074 — decisión de alcance

**DECISIÓN: opción C.**

OT-04 resolverá primero **Ubicaciones/Zonas de instalación v1** usando la DB existente.

No se añadirá `sistemas_instalacion` en OT-04.

## 4. Motivo

1. La ubicación ya existe en producción y tiene RLS.
2. Ya está conectada con OT y activos.
3. El formulario rápido y avanzado ya la consumen.
4. Falta únicamente una UI operativa para gestionarla.
5. No requiere migración.
6. Es útil en instalaciones nuevas y antiguas.
7. Reduce el riesgo antes de introducir sistemas técnicos.

Ejemplos reales de ubicación:

- Habitación 312;
- Planta 2 · Quirófanos;
- Cubierta técnica;
- Sala de cuadros;
- Central térmica;
- Cuarto de bombas;
- Sector A · Almacén;
- Zona de urgencias.

## 5. Contrato OT-04 v1

### `ClientLocation`

Campos:

- id;
- tenantId;
- installationId;
- name;
- code opcional;
- type opcional;
- description opcional;
- status `activo | inactivo`;
- createdAt;
- updatedAt.

### Acciones

Desde una instalación seleccionada:

- listar ubicaciones;
- crear ubicación;
- editar ubicación;
- activar/desactivar ubicación.

No se borrará físicamente ninguna ubicación.

### Compatibilidad

- OT existentes no se modifican;
- activos existentes no se modifican;
- ubicación sigue siendo opcional en OT rápida;
- creación de una ubicación actualiza el catálogo de creación de OT;
- no se añade ningún campo obligatorio.

## 6. Permisos frontend propuestos

Nueva capability:

`installations.locations.manage`

Asignación:

- `admin_cliente`: sí;
- `coordinador`: sí;
- `tecnico`: no;
- `tecnico_externo`: no;
- `cliente_lectura`: no.

Motivo:

La gestión de zonas es contexto operativo de mantenimiento y el RLS actual ya permite gestión a `can_manage_work_orders`.

La lectura se mantiene integrada en `clients.read` para no crear una capability innecesaria de solo visualización.

## 7. MOV-075 — contrato técnico

Implementación prevista:

- ampliar tipos de clientes con `ClientLocation`;
- repository específico de ubicaciones usando `ubicaciones`;
- service adapters;
- schema/form de ubicación;
- panel por instalación con React Query;
- invalidar `work-order-creation-catalog` después de cambios;
- tests de payload, aislamiento tenant y filtros.

## 8. OT-05 prevista

Tras estabilizar ubicaciones, OT-05 podrá abordar **Sistema técnico v1** con alcance reducido:

- una tabla `sistemas_instalacion`;
- opcional en OT;
- sin nueva RPC v2 si la RPC actual puede evolucionar de forma compatible;
- sin catálogo de 21 especialidades ni especialidades de técnicos en el mismo cambio;
- sin backfill agresivo de OT oficiales.

Ese diseño se auditará de nuevo antes de cualquier migración.

## 9. Estado de seguridad

OT-04 hasta este punto:

- DB: sin cambios;
- SQL: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- producción: sin cambios;
- Platform: sin cambios.
