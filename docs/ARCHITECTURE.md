# Arquitectura técnica

## 1. Enfoque

Aplicación única multiusuario con interfaz adaptada al rol. El frontend nunca decide por sí solo qué datos puede consultar o modificar un usuario; Supabase aplica permisos mediante RLS, funciones y triggers.

## 2. Stack

### Frontend

- React 19.
- TypeScript estricto.
- Vite.
- React Router.
- React Hook Form.
- Zod.
- TanStack Query.
- Lucide React.
- CSS propio con variables de diseño.

### Backend

- Supabase Auth.
- PostgreSQL.
- Row Level Security.
- Supabase Storage privado.
- Supabase Realtime.
- Edge Functions solo cuando una operación necesite secreto o ejecución de servidor.

### Calidad

- ESLint.
- Prettier.
- Vitest.
- Testing Library.
- Playwright.
- GitHub Actions.

## 3. Estructura prevista

```text
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
  components/
    feedback/
    forms/
    layout/
    ui/
  features/
    auth/
    dashboard/
    work-orders/
      components/
      hooks/
      pages/
      schemas/
      services/
      tests/
      types/
    technicians/
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
  seed.sql
  tests/
public/
tests/
```

## 4. Capas

### Presentación

Páginas y componentes. No contiene reglas de seguridad ni consultas SQL directas.

### Dominio

Tipos, schemas, máquina de estados, validaciones y reglas de cierre.

### Servicios

Acceso a Supabase, Storage, Realtime y generación de informes.

### Base de datos

Fuente oficial de permisos, integridad, transiciones y trazabilidad.

## 5. Navegación

### Administrador y coordinador

- `/dashboard`
- `/work-orders`
- `/work-orders/new`
- `/work-orders/:id`
- `/planning`
- `/technicians`
- `/reports`
- `/settings`
- `/audit` solo administrador

### Técnico

- `/my-work-orders`
- `/my-work-orders/:id`
- `/my-work-orders/:id/execute`
- `/scan`
- `/history`
- `/account`

Las rutas mejoran experiencia, pero la seguridad real permanece en RLS.

## 6. Estado del servidor

TanStack Query gestiona:

- listas;
- detalle;
- invalidaciones;
- reintentos;
- estados de carga y error;
- sincronización tras Realtime.

No duplicar toda la base de datos en Context. Context se limita a sesión, organización activa, tema y datos globales pequeños.

## 7. Realtime

Canales por organización y OT. Al recibir un evento:

1. validar que corresponde a la organización activa;
2. invalidar la consulta afectada;
3. mostrar notificación interna cuando proceda;
4. evitar usar el payload Realtime como única fuente de verdad.

## 8. Archivos

Buckets privados previstos:

- `work-order-photos`
- `work-order-signatures`
- `work-order-reports`

Ruta estándar:

```text
{tenant_id}/{work_order_id}/{entity}/{uuid}-{safe_filename}
```

La descarga se realiza mediante URL firmada de duración corta.

## 9. PDF

Primera implementación: generación en cliente solo si las pruebas demuestran calidad y estabilidad móvil.

Alternativa preferida para producción si el informe crece: Edge Function que renderice HTML a PDF o servicio controlado. En ambos casos:

- versión inmutable;
- hash opcional;
- almacenamiento privado;
- registro de autor y fecha;
- informe provisional y final diferenciados.

## 10. Conectividad limitada

Primera versión:

- caché de la interfaz PWA;
- lectura de la última lista cargada;
- borrador local temporal de formularios;
- reintento explícito;
- nunca asumir que un cambio local está guardado hasta confirmación de Supabase.

Una cola offline completa se desarrollará después de estabilizar el flujo online.

## 11. Observabilidad

- errores técnicos en consola solo en desarrollo;
- mensajes comprensibles al usuario;
- tabla de auditoría de negocio;
- integración futura con un servicio de errores;
- nunca registrar secretos, firmas completas ni datos sensibles en logs.

## 12. Entornos

- local;
- staging;
- producción.

Cada entorno usa un proyecto Supabase y variables distintas. No compartir datos entre entornos.

## 13. Decisiones técnicas cerradas

- Supabase es backend inicial.
- PostgreSQL es fuente oficial.
- No usar localStorage como base de datos.
- No crear backend Node separado en la primera fase.
- No generar APK antes de cerrar PWA y pruebas móviles.
- No copiar el proyecto grande completo; extraer y adaptar solo conceptos y código necesario.
