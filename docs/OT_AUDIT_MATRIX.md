# IsiVoltPro OT — Matriz de auditoría KEEP / REFACTOR / BRIDGE / MOVE / REMOVE

Fecha: 2026-08-10
Estado: **OT-00 en curso**
Rama: `docs/isivoltpro-ot-execution-master`

## 1. Significado

- **KEEP**: pertenece claramente a OT y debe conservarse/evolucionarse.
- **REFACTOR**: pertenece a OT pero necesita desacoplamiento, simplificación o nueva arquitectura.
- **BRIDGE**: OT necesita usarlo, pero la propiedad maestra futura será de Platform/otro módulo.
- **MOVE**: la funcionalidad pertenece principalmente a otro módulo del ecosistema; no debe seguir creciendo dentro de OT.
- **REMOVE**: elemento que no debe formar parte del producto objetivo, salvo compatibilidad histórica temporal.

## 2. Núcleo funcional

| Área | Estado | Decisión |
|---|---|---|
| Ciclo de vida de OT | KEEP | Es el núcleo del producto. |
| Creación de OT | KEEP + REFACTOR | Mantener lógica; añadir modo rápido y modo avanzado. |
| Asignación | KEEP + REFACTOR | Evolucionar de un técnico principal a responsable + colaboradores. |
| Visitas/intervenciones | KEEP | Reaprovechar `work_order_visits`; ampliar relevo, participantes y tiempos. |
| Checklist | KEEP | Mantener snapshot por OT y requisitos obligatorios. |
| Fotos/evidencias | KEEP | Mejorar clasificación Antes/Durante/Después, compresión y metadatos. |
| Mediciones | KEEP + REFACTOR | Convertir a dato estructurado con tipo, valor y unidad cuando sea necesario. |
| Material declarado en OT | KEEP + BRIDGE | OT registra consumo; Almacén será propietario del stock. |
| Firmas | KEEP | Mantener firma técnica/responsable según requisitos. |
| Revisión y corrección | KEEP | Mantener flujo responsable-técnico-responsable. |
| PDF | KEEP | Mantener versionado e inmutabilidad; mejorar plantilla. |
| Eventos/Auditoría | KEEP | Base imprescindible para integración y trazabilidad. |
| Planificación de técnicos | KEEP + REFACTOR | OT planifica trabajos/personas, no el plan técnico global de instalación. |
| SLA/vencimientos | KEEP + REFACTOR | Corresponde a ejecución de trabajos. |

## 3. Datos compartidos con Platform

| Área actual | Estado | Propietario futuro | Tratamiento en OT |
|---|---|---|---|
| `tenants`/organización | BRIDGE | Platform | Mantener temporalmente; acceder mediante adapter/contexto. |
| usuarios/perfiles | BRIDGE | Platform | Mantener auth actual hasta migración; evitar acoplar UI. |
| roles globales | BRIDGE + REFACTOR | Platform | Sustituir decisiones UI hardcodeadas por capabilities. |
| clientes | BRIDGE | Platform | OT necesita seleccionar/mostrar cliente, no ser catálogo maestro definitivo. |
| instalaciones/sites | BRIDGE | Platform | OT necesita seleccionar/mostrar instalación. |
| ubicaciones | BRIDGE | Platform/Activos según diseño final | OT guarda referencia y snapshot útil para el parte. |
| técnicos/empleados | BRIDGE | Platform | OT usa participantes y disponibilidad operativa. |

## 4. Activos

### `src/features/assets`

**Decisión inicial: MOVE + BRIDGE.**

Hallazgo:

- existe `AssetsWorkspace.tsx`;
- existe `AssetHistoryPanel.tsx`;
- la navegación muestra actualmente `Equipos FV`.

Tratamiento:

1. el workspace general de activos no debe evolucionar dentro de OT;
2. la navegación `Equipos FV` debe desaparecer del producto OT;
3. OT conservará selector/resumen de activo cuando un trabajo tenga `asset_id`;
4. el histórico generado por una OT validada podrá publicarse como evento/integración hacia Activos/Mantenimiento;
5. durante transición se conservará compatibilidad con datos actuales para no romper OT existentes.

## 5. Clientes e instalaciones

### `src/features/clients`

**Decisión inicial: BRIDGE + REFACTOR.**

El repositorio tiene una feature completa de clientes con API, componentes, páginas, schemas y tipos.

Objetivo futuro:

- OT debe poder buscar/seleccionar cliente e instalación;
- OT puede mostrar información operativa necesaria para realizar el trabajo;
- el CRUD maestro completo terminará en Platform;
- mientras Platform no esté integrada, el backend actual sigue operativo;
- se creará una interfaz/adaptador para evitar dependencia directa en pantallas de OT.

No se elimina todavía ninguna tabla ni pantalla hasta resolver compatibilidad y migración.

## 6. Mantenimiento programado

Se han identificado en `src/features/work-orders/api`:

- `scheduledMaintenanceRepository.ts`;
- `scheduledMaintenanceRepository.test.ts`.

Y en migraciones:

- `complete_scheduled_maintenance_on_work_order_validation`;
- `generate_work_order_from_scheduled_maintenance`;
- `generate_due_scheduled_maintenances`;
- `scheduled_maintenance_planning_actions`.

**Decisión inicial: MOVE funcional + BRIDGE de compatibilidad.**

Principio:

- Mantenimiento será propietario de planes, frecuencias, vencimientos técnicos y mantenimiento preventivo global;
- OT seguirá pudiendo recibir una OT creada desde un plan de mantenimiento;
- una OT validada notificará el resultado a Mantenimiento;
- no se borran migraciones ya aplicadas;
- el código existente se conservará hasta diseñar la sustitución por contrato/eventos;
- no se ampliará el motor de mantenimiento programado dentro de OT.

## 7. Histórico de activo

Identificados:

- `assetHistoryRepository.ts` y prueba;
- migración `asset_history_for_all_validated_work_orders`.

**Decisión: BRIDGE.**

El hecho histórico de que una OT afectó a un activo pertenece a la OT como evidencia, pero la vista maestra del histórico técnico del activo pertenecerá a Activos/Mantenimiento.

OT debe poder emitir al validar:

```text
WORK_ORDER_VALIDATED
asset_id
installation_id
work_order_id
result
dates
summary
```

## 8. Frontend principal

### `src/App.tsx`

**Decisión: REFACTOR P0.**

Hallazgos:

- archivo > 50 KB;
- contiene tipos de vista;
- navegación;
- etiquetas de estado/prioridad/tipo;
- comprobaciones de rol;
- utilidades;
- preparación de presets desde activos;
- composición de múltiples módulos.

Plan:

1. no reescribir de golpe;
2. extraer primero navegación/layout;
3. extraer páginas por dominio;
4. extraer reglas de acceso a una capa capabilities;
5. mantener tests de regresión;
6. reducir gradualmente el tamaño.

### `AuthApp.tsx`

**Decisión: BRIDGE + REFACTOR posterior.**

Autenticación actual debe seguir funcionando. La futura Platform sustituirá la autoridad global. No se debe romper auth ahora.

### `DemoApp.tsx`

**Decisión: REFACTOR/ISOLATE.**

Datos y flujo demo deben quedar claramente separados del producto real y no contaminar dominio, permisos ni branding.

## 9. Roles y permisos

Actualmente se han encontrado roles visibles/hardcodeados como:

- `admin_cliente`;
- `coordinador`;
- `tecnico`;
- `tecnico_externo`;
- `cliente_lectura`.

**Decisión: REFACTOR, sin ruptura inmediata.**

Futuro:

```text
can('work_orders.create')
can('work_orders.assign')
can('work_orders.execute')
can('work_orders.review')
can('work_orders.validate')
can('work_orders.cancel')
can('work_orders.audit.read')
```

Durante transición, un adaptador podrá traducir roles actuales a capabilities.

## 10. Base de datos OT

### KEEP

Conservar conceptualmente:

- `work_orders`;
- `work_order_checklist_items`;
- `work_order_visits`;
- `work_order_photos`;
- `work_order_materials`;
- `work_order_signatures`;
- `work_order_reports`;
- `work_order_events`;
- `audit_logs` relacionados con OT.

### REFACTOR futuro

- `assigned_to` evolucionará sin borrar compatibilidad;
- referencias de datos maestros deberán aceptar IDs provenientes de Platform;
- revisar snapshots de nombre/dirección necesarios para PDFs históricos;
- introducir contratos para colaboradores/equipo de trabajo;
- revisar SLA y bloqueos estructurados.

### Regla de migración

Nunca editar una migración ya aplicada. Todo cambio se añadirá como nueva migración reversible/documentada.

## 11. Elementos confirmados para retirar del dominio visible OT

- etiqueta/navegación `Equipos FV`;
- especialización fotovoltaica como centro del producto;
- gestión maestra de planes de mantenimiento;
- crecimiento del inventario maestro de activos dentro de OT;
- crecimiento del catálogo maestro de clientes dentro de OT una vez Platform esté disponible;
- dependencia futura de roles fijos en componentes.

## 12. Elementos que NO se tocarán todavía

Hasta cerrar OT-00:

- tablas de producción;
- datos existentes;
- RLS;
- migraciones aplicadas;
- contenedor/mini PC;
- Cloudflare;
- dominios;
- `isivoltpro-platform`;
- integración real con Activos/Mantenimiento/Almacén.

## 13. Próxima auditoría

Pendiente para cerrar esta matriz:

1. listar todos los ficheros de `work-orders/api` y clasificarlos;
2. listar componentes OT y su cobertura de tests;
3. revisar schemas de creación;
4. revisar máquina de estados;
5. revisar funciones Supabase/RPC una por una;
6. revisar `clients` y `assets` a nivel de operaciones CRUD;
7. revisar `technicians` y disponibilidad;
8. revisar dashboard/planificación;
9. búsqueda global de `HomeServe`, `FV`, `fotovoltaica` y nombres legacy;
10. revisar CI y estado actual de pruebas.

Esta matriz se actualizará antes de cualquier cambio funcional.
