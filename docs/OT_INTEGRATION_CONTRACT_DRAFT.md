# IsiVoltPro OT — Contrato de Integración (borrador v0.1)

Fecha: 2026-08-10
Estado: DRAFT
Repositorio: `izc05/homeserve`
Producto: IsiVoltPro OT

## 1. Objetivo

Definir cómo IsiVoltPro OT se relacionará con IsiVoltPro Platform y con otros módulos sin acceder directamente a sus tablas internas ni duplicar sus datos maestros.

Este documento no obliga todavía a cambiar Supabase ni `isivoltpro-platform`. Define el objetivo de compatibilidad que guiará los refactors de OT.

## 2. Principio

OT es propietario del **trabajo**.

Platform es propietario del **contexto común**.

Activos es propietario de la **identidad física/documental de activos y QR/NFC**.

Mantenimiento es propietario del **estado técnico, planes y mantenimiento preventivo de instalaciones**.

Almacén es propietario de **stock, artículos y movimientos**.

Herramientas es propietario de **herramientas, préstamos y asignaciones**.

Las apps técnicas son propietarias de sus procedimientos especializados.

## 3. Identificadores comunes

Cuando existan en Platform, OT debe aceptar referencias estables a:

```text
organization_id
client_id
installation_id
location_id
system_id
asset_id
user_id
employee_id
maintenance_plan_id
warehouse_item_id
source_module
source_record_id
```

### Reglas

1. Los IDs externos se tratan como referencias, no como permiso de acceso.
2. OT no presupone que puede modificar la entidad externa.
3. La API/adapter valida que el usuario puede consultar el contexto.
4. Los informes históricos de OT conservan snapshots suficientes aunque el nombre del cliente/instalación cambie después.
5. No usar nombres como clave de relación.

## 4. Contexto mínimo de sesión

OT debe poder recibir de Platform un objeto conceptual equivalente a:

```ts
type PlatformSessionContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  locale: string;
  timezone: string;
  capabilities: string[];
};
```

La implementación actual puede adaptar datos de Supabase a este contrato.

## 5. Capabilities OT

Borrador inicial:

```text
work_orders.read
work_orders.create
work_orders.edit_draft
work_orders.assign
work_orders.reassign
work_orders.accept
work_orders.execute
work_orders.block
work_orders.resume
work_orders.finish_technical
work_orders.review
work_orders.validate
work_orders.cancel
work_orders.reopen
work_orders.reports.read
work_orders.reports.generate
work_orders.audit.read
work_orders.planning.read
work_orders.planning.manage
work_orders.team.manage
work_orders.checklists.manage
```

### Transición

Mientras existan roles actuales, se utilizará una capa:

```text
legacy role
   ↓
capability adapter
   ↓
UI/domain decision
```

Los componentes nuevos no deberían añadir más comparaciones directas de strings de rol.

## 6. Adaptadores de datos maestros

Crear interfaces conceptuales estables.

### ClientDirectory

```ts
interface ClientDirectory {
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientSummary | null>;
}
```

### InstallationDirectory

```ts
interface InstallationDirectory {
  listInstallations(clientId?: string): Promise<InstallationSummary[]>;
  getInstallation(id: string): Promise<InstallationSummary | null>;
  listLocations(installationId: string): Promise<LocationSummary[]>;
}
```

### AssetDirectory

```ts
interface AssetDirectory {
  listAssets(input: { installationId: string; locationId?: string }): Promise<AssetSummary[]>;
  getAsset(id: string): Promise<AssetSummary | null>;
}
```

### TechnicianDirectory

```ts
interface TechnicianDirectory {
  listAssignableTechnicians(): Promise<TechnicianSummary[]>;
  getTechnician(id: string): Promise<TechnicianSummary | null>;
}
```

Primera implementación: Supabase actual.

Futura implementación: Platform/servicios comunes.

## 7. Snapshot histórico en OT

Una OT debe conservar referencias externas y datos mínimos históricos.

Ejemplo conceptual:

```text
client_id
client_name_snapshot
installation_id
installation_name_snapshot
installation_address_snapshot
location_id
location_label_snapshot
asset_id
asset_label_snapshot
```

Motivo: un parte validado no debe cambiar retroactivamente porque posteriormente se renombre una instalación o activo.

El conjunto exacto se decidirá con base de datos y PDF antes de migrar.

## 8. Eventos entrantes hacia OT

### `CREATE_WORK_ORDER`

Uso general.

Payload mínimo v1:

```json
{
  "event_version": 1,
  "organization_id": "uuid",
  "source_module": "maintenance|assets|inspections|legionella|refrigeration|platform|other",
  "source_record_id": "string",
  "client_id": "uuid|null",
  "installation_id": "uuid",
  "location_id": "uuid|null",
  "system_id": "uuid|null",
  "asset_id": "uuid|null",
  "title": "string",
  "description": "string",
  "priority": "baja|normal|alta|urgente|critica",
  "requested_due_at": "iso-datetime|null",
  "metadata": {}
}
```

OT crea borrador o flujo definido según permisos/configuración. Nunca se acepta ciegamente un `organization_id` enviado por frontend sin validación.

### Casos semánticos

- `CREATE_WORK_ORDER_FROM_ASSET`
- `CREATE_WORK_ORDER_FROM_MAINTENANCE`
- `CREATE_WORK_ORDER_FROM_INSPECTION`
- `CREATE_WORK_ORDER_FROM_LEGIONELLA`

Podrán mapear al mismo comando base con `source_module` diferente.

## 9. Eventos salientes de OT

### `WORK_ORDER_CREATED`

```text
work_order_id
code
source_module
source_record_id
```

### `WORK_ORDER_ASSIGNED`

```text
work_order_id
lead_technician_id
participant_ids
planned_at
```

### `WORK_ORDER_STARTED`

```text
work_order_id
visit_id
technician_id
started_at
```

### `WORK_ORDER_BLOCKED`

```text
work_order_id
block_reason
blocked_at
expected_resolution_at
```

### `WORK_ORDER_TECHNICALLY_FINISHED`

```text
work_order_id
finished_at
result_summary
```

### `WORK_ORDER_VALIDATED`

Payload conceptual:

```json
{
  "event_version": 1,
  "organization_id": "uuid",
  "work_order_id": "uuid",
  "code": "OT-...",
  "client_id": "uuid|null",
  "installation_id": "uuid",
  "location_id": "uuid|null",
  "system_id": "uuid|null",
  "asset_id": "uuid|null",
  "source_module": "string|null",
  "source_record_id": "string|null",
  "validated_at": "iso-datetime",
  "result_summary": "string",
  "effective_minutes": 0,
  "blocked_minutes": 0,
  "materials": [],
  "measurements": [],
  "report_reference": "string|null"
}
```

Consumidores previstos:

- Mantenimiento → histórico/estado/próximo plan;
- Activos → historial de intervenciones;
- Almacén → conciliación de consumos cuando aplique;
- módulo origen → resolver incidencia/no conformidad.

### `WORK_ORDER_CANCELLED`

Permite al módulo origen conocer que el trabajo no se ejecutará.

## 10. Integración con Activos y QR/NFC

Activos resolverá QR/NFC a una entidad física.

Flujo objetivo:

```text
Escanear QR/NFC
      ↓
Activos/Platform resuelve token
      ↓
entity_type + entity_id + permisos
      ↓
Abrir ficha o acción
      ↓
Crear OT con contexto precargado
```

OT no será propietario global del token QR/NFC.

Deep link conceptual:

```text
/isivoltpro/ot/new?installation=<id>&location=<id>&asset=<id>&source=assets
```

El formato definitivo se fijará en Platform; OT debe evitar depender de hostname concreto durante desarrollo.

## 11. Integración con Mantenimiento

Mantenimiento decide qué debe mantenerse y cuándo.

Flujo:

```text
Plan / condición / alerta
      ↓
CREATE_WORK_ORDER_FROM_MAINTENANCE
      ↓
OT ejecuta
      ↓
WORK_ORDER_VALIDATED
      ↓
Mantenimiento actualiza histórico/plan
```

La lógica de frecuencias y vencimientos globales no se ampliará en OT.

## 12. Integración con Almacén

OT registra material usado durante el trabajo.

Dos etapas posibles:

### Etapa transitoria

OT conserva descripción, referencia, cantidad y unidad.

### Etapa integrada

Un material puede incluir:

```text
warehouse_item_id
warehouse_id
quantity
unit
movement_reference
sync_status
```

OT no recalcula stock. Almacén confirma el movimiento.

## 13. Integración con Herramientas

OT podrá referenciar herramientas usadas, sin ser propietaria de su asignación permanente.

Posible relación futura:

```text
work_order_id
visit_id
tool_id
technician_id
used_from
used_to
```

## 14. Integración con apps técnicas

Ejemplos:

### Inspecciones

Defecto/no conformidad → crear OT correctiva.

### Legionella

Resultado fuera de criterio → crear OT/incidencia.

### Refrigeración

Intervención o cálculo asociado → adjuntar resultado estructurado a OT/histórico.

OT no debe duplicar el motor especializado de cada app.

## 15. Idempotencia

Todos los comandos externos que puedan reintentarse deberán usar clave de idempotencia.

Concepto:

```text
source_module + source_record_id + command_type
```

El mismo evento repetido no debe crear varias OT accidentalmente.

## 16. Seguridad

- validar organización en servidor/base de datos;
- validar capability de la acción;
- RLS continúa activa durante transición;
- un técnico no obtiene acceso a otra OT por conocer el UUID;
- no confiar en datos de deep link para permisos;
- no incluir secretos en eventos/clientes;
- archivos permanecen privados;
- auditoría en operaciones críticas.

## 17. Versionado

Todos los contratos de evento deben incluir:

```text
event_version
```

Cambios incompatibles crean versión nueva; no cambiar silenciosamente payloads existentes.

## 18. Offline

Durante trabajo sin red:

- OT puede conservar borrador local controlado;
- no se marca sincronizado hasta confirmación del servidor;
- eventos a otras apps solo se consideran emitidos tras persistencia confirmada;
- evitar duplicados mediante idempotencia.

## 19. Estrategia de migración

1. mantener Supabase OT funcionando;
2. introducir interfaces/adapters sin cambiar experiencia;
3. traducir roles actuales a capabilities;
4. añadir IDs/contexto externo donde sea necesario mediante migraciones nuevas;
5. introducir eventos versionados;
6. probar integración en staging;
7. permitir a Platform sustituir auth/directorios progresivamente;
8. mantener rollback al backend OT actual hasta paridad validada;
9. retirar duplicaciones solo después de migración comprobada.

## 20. Criterios para declarar contrato estable v1

- Platform confirma IDs comunes;
- capabilities acordadas;
- deep links acordados;
- payload CREATE_WORK_ORDER validado;
- payload WORK_ORDER_VALIDATED validado;
- idempotencia probada;
- aislamiento tenant probado;
- compatibilidad con OT existente;
- pruebas de integración OT ↔ al menos Activos y Mantenimiento;
- documentación de rollback.
