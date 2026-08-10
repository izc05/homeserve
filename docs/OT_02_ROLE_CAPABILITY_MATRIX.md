# IsiVoltPro OT — OT-02 · Matriz de paridad roles → capabilities

Fecha: 2026-08-10
Rama: `refactor/ot-capabilities-access`
Estado: **CONTRATO DE COMPATIBILIDAD v0.1**

## 1. Propósito

Este documento fija el comportamiento **actual** de la interfaz antes de sustituir checks directos por capabilities.

Regla OT-02:

> La refactorización no puede ampliar ni reducir permisos visibles de ningún rol existente sin una decisión explícita posterior.

La seguridad real sigue en RLS/RPC. Esta matriz describe únicamente la capa de presentación/acceso frontend.

## 2. Fuentes auditadas

- `src/App.tsx`;
- `src/AuthApp.tsx`;
- `src/features/technicians/technicianAccess.ts`;
- `src/features/clients/clientAccess.ts`.

Además se revisó cómo los booleanos derivados se pasan a:

- `ClientsWorkspace`;
- `TechniciansWorkspace`;
- `ChecklistTemplatesWorkspace`;
- `WorkOrderAssignmentPanel`;
- paneles de revisión/anulación;
- `TechnicianMobileWorkspace`.

## 3. Comportamiento legacy observado

### `admin_cliente`

Checks actuales:

- `isManagerRole` → sí;
- administración de técnicos → sí;
- invitaciones de técnicos → sí;
- acceso a clientes → sí;
- gestión de clientes → sí;
- gestión de usuarios desde AuthApp → sí;
- modo técnico → no.

Consecuencia UI:

- dashboard administrativo;
- listado OT;
- planificación;
- crear OT;
- asignar/reasignar;
- revisar/validar;
- anular;
- técnicos;
- invitar técnicos;
- clientes/instalaciones;
- editar maestros de clientes mientras exista esta compatibilidad;
- informes;
- auditoría;
- configuración/plantillas;
- gestión de usuarios.

### `coordinador`

Checks actuales:

- `isManagerRole` → sí;
- administración de técnicos → sí;
- invitaciones de técnicos → no;
- acceso a clientes → sí;
- gestión de clientes → no;
- gestión de usuarios → no;
- modo técnico → no.

Consecuencia UI:

- dashboard administrativo;
- listado OT;
- planificación;
- crear OT;
- asignar/reasignar;
- revisar/validar;
- anular;
- consultar técnicos;
- consultar clientes/instalaciones;
- informes;
- auditoría;
- configuración/plantillas;
- **no** invitar técnicos;
- **no** editar clientes;
- **no** gestionar usuarios.

### `tecnico`

Checks actuales:

- manager → no;
- `isTechnicianRole` → sí;
- administración de técnicos → no;
- clientes → no;
- gestión usuarios → no.

Consecuencia UI:

- entrada directa a zona técnico;
- navegación técnica exclusiva;
- ejecución de OT asignadas;
- aceptar/iniciar/bloquear/reanudar/finalizar según flujo;
- checklist/fotos/cierre cuando corresponde;
- sin creación/asignación/revisión administrativa;
- sin clientes/técnicos/configuración/auditoría.

### `tecnico_externo`

La interfaz lo considera técnico mediante `isTechnicianRole`.

Consecuencia esperada de paridad:

- misma familia de navegación técnica que `tecnico`;
- no obtiene capacidades administrativas;
- el backend/RLS sigue determinando el alcance de datos que realmente puede leer/ejecutar.

OT-02 no equipara ni diferencia más ambos roles de lo que hace hoy la UI.

### `cliente_lectura`

No es manager ni técnico.

Comportamiento actual de `App.tsx`:

- arranca en dashboard;
- navegación principal no técnica: Dashboard, Órdenes y Planificación;
- no muestra navegación secundaria administrativa porque no tiene `canAccessTechnicianAdministration`;
- no puede crear OT;
- no gestiona clientes;
- no gestiona técnicos;
- no gestiona usuarios;
- no revisa/anula como manager.

Este comportamiento, aunque pueda revisarse comercialmente en el futuro, se conserva exactamente en OT-02.

### Rol desconocido

Los helpers legacy no lo reconocen como manager/técnico/admin.

Contrato OT-02:

- deny by default para capabilities de mutación;
- no conceder capacidades administrativas;
- no inventar equivalencias.

## 4. Capabilities mínimas necesarias

Tras la auditoría se ajusta la lista inicial a capacidades que reflejan decisiones reales de UI.

### Navegación / lectura

- `dashboard.read`
- `work_orders.read`
- `planning.read`
- `technician_workspace.read`
- `technicians.read`
- `clients.read`
- `reports.read`
- `work_orders.audit.read`
- `work_order_templates.read`

### Mutación OT

- `work_orders.create`
- `work_orders.assign`
- `work_orders.execute`
- `work_orders.review`
- `work_orders.validate`
- `work_orders.cancel`

### Administración auxiliar

- `planning.manage`
- `technicians.invite`
- `clients.manage`
- `work_order_templates.manage`
- `users.manage`

No se crea por ahora una capability genérica `manage`, porque ocultaría diferencias reales entre admin y coordinador.

## 5. Mapa v0.1 propuesto

### admin_cliente

- dashboard.read
- work_orders.read
- planning.read
- technicians.read
- clients.read
- reports.read
- work_orders.audit.read
- work_order_templates.read
- work_orders.create
- work_orders.assign
- work_orders.review
- work_orders.validate
- work_orders.cancel
- planning.manage
- technicians.invite
- clients.manage
- work_order_templates.manage
- users.manage

**No** se añade `work_orders.execute` como permiso UI de manager en esta fase, porque la interfaz actual reserva ejecución técnica al técnico asignado.

### coordinador

- dashboard.read
- work_orders.read
- planning.read
- technicians.read
- clients.read
- reports.read
- work_orders.audit.read
- work_order_templates.read
- work_orders.create
- work_orders.assign
- work_orders.review
- work_orders.validate
- work_orders.cancel
- planning.manage
- work_order_templates.manage

No incluye:

- technicians.invite
- clients.manage
- users.manage
- work_orders.execute

### tecnico

- work_orders.read
- technician_workspace.read
- work_orders.execute

### tecnico_externo

- work_orders.read
- technician_workspace.read
- work_orders.execute

Sin capacidades administrativas adicionales.

### cliente_lectura

- dashboard.read
- work_orders.read
- planning.read

No incluye reports.read porque la navegación actual no expone Informes a este rol.

### desconocido

- ninguna capability.

## 6. Correspondencia de checks actuales

| Check legacy | Capability destino |
|---|---|
| `isManagerRole(role)` para crear OT | `work_orders.create` |
| `isManagerRole(role)` para asignar | `work_orders.assign` |
| `isManagerRole(role)` para revisar | `work_orders.review` |
| `isManagerRole(role)` para validar | `work_orders.validate` |
| `isManagerRole(role)` para anular | `work_orders.cancel` |
| `isTechnicianRole(role)` | `technician_workspace.read` / `work_orders.execute` según contexto |
| `canAccessTechnicianAdministration(role)` | `technicians.read` |
| `canManageTechnicianInvitations(role)` | `technicians.invite` |
| `canAccessClientNavigation(role)` | `clients.read` |
| `canManageClientRecords(role)` | `clients.manage` |
| `canManageUsers(role)` | `users.manage` |
| configuración/plantillas con `canManage` | `work_order_templates.manage` |
| auditoría cargada con manager | `work_orders.audit.read` |

## 7. Casos que NO se simplificarán incorrectamente

### Admin vs coordinador

No usar:

```text
isManager → todos los permisos administrativos
```

porque hoy difieren en:

- invitaciones de técnicos;
- edición de clientes;
- gestión de usuarios.

### Técnico vs manager

No conceder `work_orders.execute` a manager únicamente porque el backend tenga una función de gestión. La UI actual exige técnico asignado para ejecución.

### Cliente lectura

No convertir automáticamente `work_orders.read` en acceso a todos los módulos secundarios.

## 8. Estado de MOV-042

**COMPLETADO para el núcleo real de autenticación/navegación.**

Hallazgo principal:

La arquitectura puede centralizarse con un mapa role → capability sin cambiar el comportamiento, siempre que las capabilities sean suficientemente específicas.

## 9. Siguiente movimiento

**MOV-043:** crear `src/auth/capabilities.ts` como capa pura y sin dependencias de React/Supabase.

Antes de migrar `App.tsx`, se ejecutará **MOV-044** con tests exhaustivos de la matriz anterior.
