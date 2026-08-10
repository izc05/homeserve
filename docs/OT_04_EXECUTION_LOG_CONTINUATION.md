# IsiVoltPro OT — OT-04 · Continuación de bitácora

Fecha: 2026-08-10
Rama: `feat/ot-installation-context`
PR: #47
Base exacta: `main` @ `365f7423ff9143c33632f4f6fb1bb3e81e9bf6da`

## MOV-072 — Auditoría del modelo actual

**COMPLETADO.**

Se confirmó que `main` ya contiene:

- `clientes`;
- `instalaciones`;
- `ubicaciones`;
- `activos`;
- `ordenes_trabajo`.

`ubicaciones` ya está relacionada con activos y OT y dispone de RLS por tenant. El catálogo de creación de OT ya consume ubicaciones activas.

Carencia real detectada: la UI de clientes/instalaciones no permitía gestionar las ubicaciones existentes en DB.

## MOV-073 — PR #31 como referencia

**COMPLETADO.**

Se revisaron únicamente los patches históricos relacionados con sistemas técnicos.

La propuesta antigua agrupaba en una sola fase:

- 21 especialidades;
- sistemas técnicos;
- referencias desde activos/OT;
- campos de instalación;
- especialidades de técnicos;
- backfills;
- checklist;
- una nueva RPC `create_work_order_v2`.

Decisión: no copiar ni continuar esa solución masiva.

## MOV-074 — Alcance real

**COMPLETADO.**

OT-04 = **Ubicaciones/Zonas de instalación v1** utilizando la tabla y RLS existentes.

No se introduce `sistemas_instalacion` en esta fase.

Documento de decisión:

`docs/OT_04_AUDIT_DECISION.md`.

## MOV-075 — Contrato técnico

**COMPLETADO.**

### Capability

Se añade:

`installations.locations.manage`

Permitida a:

- `admin_cliente`;
- `coordinador`.

Denegada a:

- `tecnico`;
- `tecnico_externo`;
- `cliente_lectura`;
- rol desconocido.

### Dominio

Archivos:

- `src/features/clients/types/location.ts`;
- `src/features/clients/schemas/locationSchema.ts`.

Campos v1:

- tenant;
- instalación;
- nombre;
- código opcional;
- tipo opcional;
- descripción opcional;
- estado activo/inactivo;
- timestamps.

## MOV-076 — Repository y tests

**COMPLETADO.**

Archivo:

`src/features/clients/api/installationLocationRepository.ts`

Operaciones:

- listado por `tenant_id + instalacion_id + deleted_at IS NULL`;
- alta;
- edición filtrada por tenant + instalación + id;
- activar/desactivar;
- sin función de borrado físico.

Test:

`installationLocationRepository.test.ts`.

### CI intermedio

Quality 267 falló exclusivamente por la inferencia literal del fixture de test `estado: 'activo'`.

Se corrigió solo el tipo del fixture a `activo | inactivo`; el repository funcional no cambió.

Quality 268 → **success**.

## MOV-077 — Panel de ubicaciones

**COMPLETADO.**

Archivo:

`src/features/clients/components/InstallationLocationsPanel.tsx`

Funciones:

- listar zonas de la instalación;
- crear;
- editar;
- activar/desactivar;
- formulario inline;
- cambio limpio de contexto al abrir otra instalación;
- lectura del estado;
- sin borrado físico.

Después de cualquier cambio invalida:

- `installation-locations`;
- `work-order-creation-catalog`.

Así la nueva ubicación aparece en OT rápida y avanzada sin nueva lógica de backend.

Quality 269 sobre el panel aislado → **success**.

## MOV-078 — Integración con clientes y creación OT

**COMPLETADO.**

### `ClientsWorkspace.tsx`

Cambios revisados:

- import de `InstallationLocationsPanel`;
- prop `canManageLocations`;
- panel mostrado bajo la ficha abierta de la instalación, junto a la galería de fotos.

Control de diff del commit:

- un archivo;
- 8 líneas modificadas;
- sin cambios en lógica de cliente/instalación existente.

### `App.tsx`

Se añade:

`hasCapability(viewerRole, 'installations.locations.manage')`

Y se pasa a `ClientsWorkspace` mediante:

`canManageLocations={canManageLocations}`.

Control de diff del commit:

- un archivo;
- 2 adiciones;
- 1 eliminación;
- ningún otro cambio en App.

Resultado de permisos:

- administrador puede editar maestro de cliente e instalaciones y gestionar zonas;
- coordinador sigue sin editar el maestro de cliente, pero sí puede gestionar zonas operativas;
- técnico/lectura no reciben gestión de zonas.

La ubicación sigue siendo opcional en OT rápida y avanzada.

## MOV-079 — Contexto de instalación

**COMPLETADO en alcance v1.**

La ficha abierta de una instalación muestra ahora:

1. datos de instalación existentes;
2. galería de fotos;
3. ubicaciones/zonas registradas;
4. alta/edición/estado cuando la capability lo permite.

No se convierte OT en maestro de activos ni se crea un módulo separado de sistemas.

## MOV-080 — Tests UI/regresión

**COMPLETADO en implementación.**

### `locationSchema.test.ts`

Protege:

- ubicación mínima válida;
- estado inactivo;
- campos opcionales;
- nombre significativo obligatorio.

### `installationLocationsDomainGuard.test.ts`

Protege:

- capability explícita en App;
- prop a ClientsWorkspace;
- panel dentro de la instalación;
- invalidación de catálogo de creación OT;
- copy que mantiene ubicación opcional;
- ausencia de `.delete(` en el repository;
- uso de soft-state.

## MOV-081 — Próximo movimiento

Congelar funcionalmente OT-04 y revisar el diff global de PR #47.

Confirmar ausencia de:

- nuevas migraciones;
- SQL;
- RLS;
- RPC;
- Storage;
- workflows;
- Docker/Cloudflare;
- mini PC/producción;
- cambios en `isivoltpro-platform`.

## MOV-082 — PR #47

Ya está abierta como Draft. Tras MOV-081 se actualizará al estado final.

## MOV-083 — CI final

Ejecutar Quality sobre el HEAD definitivo después de esta documentación.

Requerido:

- install;
- branding;
- typecheck;
- lint;
- tests;
- build.

## MOV-084 — Ready

Solo con:

- mismo HEAD validado;
- Quality verde;
- diff exacto;
- PR mergeable.

## MOV-085 — Squash & Merge

Solo después de MOV-084.

## MOV-086 — OT-05

Crear nueva rama únicamente desde el nuevo `main`.

Fase prevista: **Sistema técnico v1**, comenzando de nuevo por auditoría/diseño mínimo y manteniendo sistema y activo opcionales en la creación de OT.

## Estado de seguridad

- DB: sin cambios;
- SQL: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- migraciones: sin cambios;
- Storage: sin cambios;
- producción: sin cambios;
- mini PC: sin cambios;
- Platform: sin cambios.
