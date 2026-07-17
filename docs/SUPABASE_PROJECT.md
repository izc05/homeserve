# Supabase conectado

## Proyecto oficial

- Nombre: `izc05's Project`
- Project ref: `ubfbhzovebrmmjpyygnm`
- Región: `eu-west-1`
- URL: `https://ubfbhzovebrmmjpyygnm.supabase.co`
- PostgreSQL: 17
- Estado comprobado el 17 de julio de 2026: `ACTIVE_HEALTHY`

El frontend usa una `publishable key`. Nunca añadir `service_role`, secret keys, contraseñas de base de datos ni tokens privados al repositorio.

## Decisión de integración

Este proyecto no empieza con una base vacía. Ya contiene la base creada para `isivolpro-activos` y datos existentes. El nuevo gestor OT debe adaptarse a este esquema mediante migraciones compatibles.

Reglas obligatorias:

1. No borrar tablas ni datos existentes.
2. No ejecutar `DROP TABLE`, `TRUNCATE` o cambios irreversibles sin copia y aprobación expresa.
3. Toda migración debe ser idempotente cuando sea posible.
4. Las migraciones se prueban primero sobre una copia o rama de desarrollo.
5. Antes y después de cada DDL se ejecutan advisors de seguridad y rendimiento.
6. Generar de nuevo los tipos TypeScript después de cada cambio de esquema.

## Tablas que se reutilizan

### Identidad y organizaciones

- `profiles`
- `tenants`
- `tenant_members`
- `tenant_invitations`

### Contexto mínimo de OT

- `instalaciones`
- `ubicaciones`
- `activos`

Estas entidades permanecen como datos auxiliares. No se crearán módulos generales de inventario, OCA o mantenimiento fuera de OT.

### Núcleo OT

- `ordenes_trabajo`
- `ot_visitas`
- `ot_checklist_respuestas`
- `ot_fotos`
- `ot_visita_materiales`
- `ot_informes`
- `ot_revisiones_admin`
- `audit_logs`

### Opcionales futuros

- `ot_verificaciones_qr`
- `qr_registry`
- `sync_queue`

## Datos existentes observados

La base no está vacía. En la revisión inicial se encontraron, entre otros:

- 2 organizaciones.
- 3 perfiles.
- 4 miembros de organización.
- 4 instalaciones.
- 13 ubicaciones.
- 22 activos.
- 6 órdenes de trabajo.
- 5 visitas.
- 18 respuestas de checklist.
- 735 registros de auditoría.

Estos datos deben preservarse durante la transición.

## Diferencias con el producto definitivo

### Roles heredados

La tabla `tenant_members` usa actualmente:

- `admin_cliente`
- `tecnico`
- `tecnico_externo`
- `cliente_lectura`

Modelo definitivo:

- `administrador`
- `coordinador`
- `tecnico`

Plan de compatibilidad:

- `admin_cliente` se interpreta inicialmente como `administrador`.
- `tecnico` y `tecnico_externo` se interpretan como `tecnico`.
- Se añadirá `coordinador` mediante migración.
- `cliente_lectura` queda fuera de la primera versión, sin borrar datos.

No cambiar el constraint de roles hasta crear pruebas RLS y un script de migración de miembros existentes.

### Estados heredados

La tabla `ordenes_trabajo` admite actualmente:

`BORRADOR`, `NUEVA`, `ASIGNADA`, `ACEPTADA`, `EN_CURSO`, `PAUSADA`, `PENDIENTE_MATERIAL`, `PENDIENTE_CLIENTE`, `FINALIZADA`, `FIRMADA`, `INFORME_GENERADO`, `VALIDADA`, `CERRADA`, `CANCELADA`.

Estados oficiales nuevos:

`BORRADOR`, `ASIGNADA`, `ACEPTADA`, `EN_CURSO`, `BLOQUEADA`, `FINALIZADA_TECNICO`, `VALIDADA`, `CANCELADA`.

Mapeo provisional de lectura:

| Estado heredado | Estado mostrado |
|---|---|
| BORRADOR, NUEVA | BORRADOR |
| ASIGNADA | ASIGNADA |
| ACEPTADA | ACEPTADA |
| EN_CURSO | EN_CURSO |
| PAUSADA, PENDIENTE_MATERIAL, PENDIENTE_CLIENTE | BLOQUEADA |
| FINALIZADA, FIRMADA, INFORME_GENERADO | FINALIZADA_TECNICO |
| VALIDADA, CERRADA | VALIDADA |
| CANCELADA | CANCELADA |

Primero se aplicará este mapeo en la capa de dominio. La migración física de datos se hará solo después de probar todos los casos existentes.

Para `BLOQUEADA` se añadirá un motivo estructurado, manteniendo compatibilidad con los estados antiguos mientras dure la transición.

## Seguridad actual

Todas las tablas operativas revisadas tienen RLS activado, lo cual es una buena base. Sin embargo, los advisors detectan numerosos avisos sobre funciones `SECURITY DEFINER` ejecutables desde los roles `anon` o `authenticated`.

Antes de producción se debe:

1. Inventariar cada función y decidir si es RPC pública, helper de RLS o trigger interno.
2. Revocar `EXECUTE` a `PUBLIC`, `anon` y `authenticated` en funciones internas.
3. Mover helpers privilegiados a un esquema no expuesto cuando proceda.
4. Mantener una comprobación explícita de `auth.uid()` en toda RPC privilegiada.
5. Preferir `SECURITY INVOKER` salvo necesidad demostrada.
6. Revisar especialmente RPC de invitaciones, administración, auditoría, QR y OT.
7. Activar protección frente a contraseñas filtradas en Auth.

No corregir avisos de `SECURITY DEFINER` de forma masiva sin entender su uso en RLS; un cambio indiscriminado podría bloquear la aplicación o abrir accesos.

## Rendimiento actual

Los advisors detectan:

- numerosas claves foráneas sin índice;
- políticas RLS que llaman `auth.uid()` por fila en lugar de `(select auth.uid())`;
- políticas permisivas duplicadas en `tenant_members`;
- índices aún no utilizados.

Prioridad para el módulo OT:

1. Índices compuestos por `tenant_id`, `estado`, `assigned_to`, `fecha_prevista` y `updated_at`.
2. Índices en `ot_id` para visitas, checklist, fotos, materiales, informes y revisiones.
3. Optimizar solo consultas verificadas con `EXPLAIN ANALYZE`.
4. No eliminar índices marcados como no usados durante la fase inicial: la base tiene pocos datos y la estadística aún no es representativa.

## Tipos TypeScript

Los tipos deben generarse desde este proyecto, nunca escribirse manualmente:

```bash
npx supabase gen types typescript --project-id ubfbhzovebrmmjpyygnm > src/types/database.generated.ts
```

Después:

```bash
npm run typecheck
npm run test
npm run build
```

## Primera migración prevista

La primera migración del nuevo repositorio será de compatibilidad, no de sustitución. Debe incluir de forma separada y comprobable:

1. índices críticos del módulo OT;
2. soporte para rol `coordinador`;
3. campos de bloqueo normalizado;
4. versionado explícito de informes PDF;
5. tabla o columnas de presencia técnica;
6. endurecimiento de permisos de funciones estrictamente relacionadas con OT;
7. pruebas SQL de aislamiento entre dos técnicos.

No debe cambiar todavía los valores antiguos de `estado` ni eliminar módulos heredados.
