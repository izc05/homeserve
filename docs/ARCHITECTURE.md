# Arquitectura técnica — IsiVoltPro OT

## 1. Enfoque

IsiVoltPro OT es un módulo multiusuario centrado en órdenes de trabajo.

El frontend nunca decide por sí solo qué datos puede consultar o modificar un usuario. El backend actual aplica permisos mediante Supabase, PostgreSQL, RLS, funciones y triggers.

La arquitectura debe permitir sustituir progresivamente autenticación y directorios maestros por **IsiVoltPro Platform** sin reescribir el dominio OT.

## 2. Principio de propiedad

### OT posee

- órdenes de trabajo;
- ciclo de vida;
- equipo operativo de una OT;
- visitas;
- checklist de ejecución;
- evidencias;
- bloqueos y tiempos;
- revisión;
- informes;
- eventos y auditoría OT.

### OT consume mediante adaptadores

- organización;
- usuario;
- capabilities;
- clientes;
- instalaciones;
- ubicaciones;
- sistemas;
- activos;
- técnicos/empleados.

Estos datos pueden seguir procediendo temporalmente del Supabase existente, pero los componentes no deben asumir que esa será siempre la fuente maestra.

## 3. Stack actual

### Frontend

- React 18.
- TypeScript estricto.
- Vite.
- React Router.
- React Hook Form.
- Zod.
- TanStack Query.
- Lucide React.
- CSS propio con variables de diseño.

### Backend actual

- Supabase Auth.
- PostgreSQL.
- Row Level Security.
- Supabase Storage privado.
- Supabase Realtime.
- funciones/RPC PostgreSQL para transiciones críticas.
- Edge Functions solo cuando una operación necesite secreto o ejecución controlada de servidor.

### Calidad

- ESLint.
- Vitest.
- Testing Library.
- Playwright cuando aplique.
- pruebas SQL/RLS.
- GitHub Actions.

## 4. Estructura objetivo incremental

No se realizará una reescritura total. La estructura actual se migrará gradualmente hacia:

```text
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
    capabilities.ts
  components/
    feedback/
    forms/
    layout/
    ui/
  integrations/
    platform/
      session.ts
      capabilities.ts
      clients.ts
      installations.ts
      assets.ts
      technicians.ts
    events/
      contracts.ts
      publisher.ts
      consumer.ts
  features/
    dashboard/
    work-orders/
      api/
      components/
      domain/
      forms/
      hooks/
      pages/
      services/
      tests/
      types/
    technicians/
    checklists/
    reports/
    settings/
  lib/
    supabase.ts
    queryClient.ts
  routes/
  styles/
  types/
  utils/
supabase/
  migrations/
  tests/
public/
tests/
```

`src/App.tsx` se reducirá gradualmente. Cada extracción debe conservar comportamiento y pruebas.

## 5. Capas

### Presentación

Páginas y componentes.

No debe contener:

- SQL;
- reglas críticas de seguridad;
- decisiones nuevas basadas directamente en strings de rol;
- conocimiento de tablas de otros módulos.

### Dominio OT

Contiene:

- tipos;
- schemas;
- estados;
- transiciones;
- requisitos;
- reglas de cierre;
- contratos de visitas/equipo;
- validaciones de negocio.

Debe ser independiente de la interfaz y, en lo posible, de Supabase.

### Aplicación/servicios

Orquesta:

- creación;
- asignación;
- ejecución;
- cierre;
- revisión;
- consultas;
- directorios externos;
- publicación/consumo de eventos.

### Adaptadores

Traducen contratos estables a la infraestructura actual o futura.

Ejemplo:

```text
UI OT
  ↓
InstallationDirectory
  ↓
Supabase actual
```

Futuro:

```text
UI OT
  ↓
InstallationDirectory
  ↓
IsiVoltPro Platform
```

### Base de datos

Fuente oficial actual de:

- permisos;
- integridad;
- transiciones;
- persistencia;
- trazabilidad.

Las migraciones aplicadas son inmutables. Los cambios se añaden mediante migraciones nuevas.

## 6. Contexto de sesión

Context se limita a datos globales pequeños.

Contrato conceptual objetivo:

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

Durante transición un adapter construirá este contexto desde perfiles/tenant/roles actuales.

## 7. Capabilities

Los componentes nuevos deben tender a consultar capacidades como:

```text
work_orders.read
work_orders.create
work_orders.assign
work_orders.execute
work_orders.block
work_orders.finish_technical
work_orders.review
work_orders.validate
work_orders.cancel
work_orders.planning.manage
```

Los roles legacy se traducirán a capabilities mediante una capa compatible hasta la integración con Platform.

La seguridad real sigue verificándose en servidor/RLS/RPC.

## 8. Datos maestros y directorios

Interfaces estables previstas:

- `ClientDirectory`;
- `InstallationDirectory`;
- `AssetDirectory`;
- `TechnicianDirectory`.

El código de pantallas OT debe dejar de consultar directamente múltiples tablas maestras cuando exista su adapter equivalente.

### Regla de snapshots

Las OT validadas conservan datos históricos suficientes para que el documento no cambie retroactivamente si se modifica el maestro externo.

## 9. Navegación objetivo

### Panel operativo

- `/dashboard`
- `/work-orders`
- `/work-orders/new`
- `/work-orders/:id`
- `/planning`
- `/technicians`
- `/reports`
- `/settings`
- `/audit` cuando exista capability.

### Técnico

- `/my-work-orders`
- `/my-work-orders/:id`
- `/my-work-orders/:id/execute`
- `/history`
- `/account`

### Entrada desde QR/NFC

El QR/NFC global será resuelto por Activos/Platform y enviará a OT mediante deep link con contexto autorizado.

OT no será propietario del registro global de etiquetas.

Las rutas solo mejoran experiencia; RLS/RPC continúan siendo la frontera real de seguridad.

## 10. Estado del servidor

TanStack Query gestiona:

- listas;
- detalle;
- invalidaciones;
- reintentos;
- estados de carga/error;
- sincronización tras Realtime.

No duplicar la base de datos completa en Context.

## 11. Realtime

Canales por organización y OT.

Al recibir un evento:

1. comprobar contexto autorizado;
2. invalidar consulta afectada;
3. mostrar notificación cuando proceda;
4. volver a consultar la fuente oficial;
5. no usar el payload Realtime como única fuente de verdad.

Realtime interno no sustituye a los contratos de integración entre módulos.

## 12. Eventos del ecosistema

OT debe preparar contratos versionados.

### Entradas

- `CREATE_WORK_ORDER`;
- creación desde Activos;
- creación desde Mantenimiento;
- creación desde Inspecciones;
- creación desde Legionella;
- creación desde apps técnicas.

### Salidas

- `WORK_ORDER_CREATED`;
- `WORK_ORDER_ASSIGNED`;
- `WORK_ORDER_STARTED`;
- `WORK_ORDER_BLOCKED`;
- `WORK_ORDER_TECHNICALLY_FINISHED`;
- `WORK_ORDER_VALIDATED`;
- `WORK_ORDER_CANCELLED`.

Reglas:

- incluir `event_version`;
- validar organización y permisos;
- idempotencia para comandos reintentables;
- no compartir secretos;
- no escribir directamente en tablas de otros módulos.

## 13. Archivos

Buckets privados de OT:

- fotografías/evidencias;
- firmas;
- informes.

Rutas tenant-scoped.

La descarga se realiza mediante URL firmada temporal.

Los archivos de cliente/instalación/activo que pertenezcan al maestro externo deberán consultarse mediante el adapter correspondiente cuando Platform/Activos estén disponibles.

## 14. PDF

Principios:

- provisional y final diferenciados;
- versión inmutable;
- almacenamiento privado;
- autor y fecha;
- hash cuando proceda;
- snapshots históricos;
- diseño A4 estable;
- prueba móvil y con alto volumen de fotos/checklist.

La generación podrá ser cliente o servidor según las pruebas, pero el contrato documental no cambia.

## 15. Estados y transiciones

Estado canónico del dominio:

```text
BORRADOR
ASIGNADA
ACEPTADA
EN_CURSO
BLOQUEADA
FINALIZADA_TECNICO
VALIDADA
CANCELADA
```

Las migraciones históricas con estados legacy no se editan. La compatibilidad se conserva hasta demostrar que puede retirarse.

Las transiciones críticas se ejecutan mediante RPC y se verifican también en servidor.

## 16. Bloqueos

`BLOQUEADA` es un único estado.

El motivo es dato estructurado separado.

Modelo objetivo futuro:

```text
reason
notes
blocked_at
resolved_at
expected_resolution_at
resolution_owner
```

No crear estados diferentes por cada motivo.

## 17. Equipo y visitas

`assigned_to` se mantiene por compatibilidad como responsable principal mientras se diseña una relación aditiva de participantes.

Modelo objetivo:

- responsable principal;
- colaboradores;
- externos;
- múltiples visitas;
- tiempos por visita;
- relevo/próxima actuación.

Nunca romper OT históricas durante la migración.

## 18. Conectividad limitada

Primera etapa:

- caché PWA de interfaz;
- última lista cargada;
- borrador local temporal;
- reintento explícito;
- nunca asumir sincronización hasta confirmación del servidor.

Una cola offline completa se hará solo tras estabilizar el flujo online e idempotencia.

## 19. Seguridad

Principios obligatorios:

- RLS activa;
- no confiar en tenant/IDs enviados por cliente;
- técnico no accede a OT ajena por conocer UUID;
- funciones públicas con ACL explícita;
- `SECURITY DEFINER` solo cuando esté justificado y con validación explícita;
- Storage privado;
- auditoría crítica;
- no secretos en frontend;
- no permisos basados únicamente en React.

## 20. Calidad y CI

Antes de fusionar cambios funcionales:

- typecheck;
- lint;
- unit tests;
- build;
- pruebas SQL/RLS cuando afecte backend;
- E2E cuando afecte flujos críticos;
- revisión móvil cuando afecte técnico;
- PDF cuando afecte documentación.

Los workflows actuales se consolidarán posteriormente en una configuración Node/npm única.

## 21. Entornos

- local;
- staging;
- producción.

No compartir datos ni secretos entre entornos.

El mini PC no se actualiza hasta validar la rama/PR correspondiente.

## 22. Decisiones técnicas cerradas

- Supabase permanece como backend operativo inicial de OT.
- PostgreSQL/RLS siguen siendo autoridad hasta integración real.
- no usar localStorage como base principal;
- no crear un segundo backend central paralelo a Platform;
- no duplicar el núcleo de organizaciones/permisos que está construyendo Codex;
- no ampliar dentro de OT el motor maestro de mantenimiento programado;
- no ampliar dentro de OT el inventario maestro de activos;
- no reescribir todo el frontend de una vez;
- introducir adapters antes de sustituir fuentes maestras;
- integrar módulos mediante contratos versionados y no mediante acceso directo a sus tablas.
