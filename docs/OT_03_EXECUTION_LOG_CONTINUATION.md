# IsiVoltPro OT — OT-03 · Continuación de bitácora

Fecha: 2026-08-10
Rama: `feat/ot-quick-create`
PR: #46 (Draft durante la validación)
Base: `main` @ `b2856aa069d51f8b2149b708570692846dfce103`

## MOV-058 — Contrato puro de OT rápida

**Estado:** COMPLETADO.

Archivos:

- `src/features/work-orders/forms/quickCreateWorkOrderSchema.ts`
- `src/features/work-orders/domain/quickWorkOrder.ts`

Contrato final:

- cliente obligatorio;
- instalación obligatoria;
- ubicación opcional;
- activo opcional;
- título/problema obligatorio;
- prioridad por defecto `normal`;
- descripción opcional;
- tipo forzado a `averia`;
- técnico `null`;
- planificación `null`;
- duración `null`;
- misma RPC `create_work_order` mediante `createWorkOrder()`.

Preset de cierre rápido:

- checklist: false;
- fotos iniciales: false;
- fotos finales: true;
- mediciones: false;
- materiales: false;
- firmas: false;
- prueba funcional: false;
- informe: false;
- revisión administrativa: true.

## MOV-059 — Tests del contrato

**Estado:** COMPLETADO.

Archivo:

`src/features/work-orders/domain/quickWorkOrder.test.ts`

Valida:

- avería mínima sin ubicación/activo;
- cliente/instalación/título obligatorios;
- técnico y fechas nulos;
- activo/ubicación preservados cuando se conocen;
- requisitos de cierre compatibles con la versión actual;
- organización obligatoria antes de backend.

**Quality 257:** success.

## MOV-060 — `QuickCreateWorkOrderForm`

**Estado:** COMPLETADO.

Archivo:

`src/features/work-orders/components/QuickCreateWorkOrderForm.tsx`

Características:

- reutiliza `loadWorkOrderCreationCatalog`;
- reutiliza `createWorkOrder`;
- reutiliza `buildQuickWorkOrderInput`;
- cliente → filtra instalaciones;
- instalación → filtra ubicaciones/activos;
- ubicación opcional;
- activo opcional;
- problema con autofocus;
- prioridad;
- detalles opcionales;
- crea borrador sin técnico/fecha;
- invalida queries existentes;
- mantiene guard de acceso de creación.

Mensaje explícito al usuario:

> Activo no obligatorio.

Si el cliente no tiene instalaciones, la UI indica que se debe usar el modo Avanzado para dar de alta una instalación.

## MOV-061 — Workspace Rápida / Avanzada

**Estado:** COMPLETADO.

Archivo:

`src/features/work-orders/components/WorkOrderCreateWorkspace.tsx`

Reglas:

- `Nueva OT` sin contexto → **Rápida**;
- flujo precargado desde cliente/activo/técnico/OT relacionada → **Avanzada**;
- usuario puede cambiar manualmente entre ambos modos.

El formulario avanzado existente no se elimina.

### Tests

`WorkOrderCreateWorkspace.test.tsx`

Incidencias de test corregidas sin tocar producto:

1. El repo no usa matchers tipados de jest-dom → se cambiaron por Vitest estándar.
2. El test necesitaba `// @vitest-environment jsdom` → se añadió siguiendo el patrón de tests React existentes.

**Quality 260:** falló en typecheck solo por matchers del test.

**Quality 261:** falló solo porque el test se ejecutaba sin DOM.

**Quality 262:** success completo.

Conclusión: los fallos fueron exclusivamente del test nuevo, no de los componentes.

## MOV-062 — Integración en `App.tsx`

**Estado:** COMPLETADO.

Commit de integración:

`1b177a6844f29c7d3e88d480057505f44619174b`

Técnica usada:

El import que anteriormente apuntaba a:

`CreateWorkOrderForm`

pasa a resolver:

`WorkOrderCreateWorkspace`.

Se mantienen exactamente el nombre local y los props para minimizar riesgo.

### Control de diff

Comparación contra el commit anterior:

- archivo: `src/App.tsx`;
- adiciones: 1;
- eliminaciones: 1;
- total: 2 líneas.

No se modifica navegación, estados, mutaciones ni backend.

**Quality 263:** success completo.

## MOV-063 — Neutralización multisector del modo Avanzado

**Estado:** COMPLETADO.

Archivo:

`src/features/work-orders/components/CreateWorkOrderForm.tsx`

Se sustituyen únicamente defaults/copy sectoriales:

- `fotovoltaica` → `instalacion_tecnica`;
- `inversor_fotovoltaico` → `equipo_tecnico`;
- `Alta rápida de instalación FV` → `Alta rápida de instalación`;
- ejemplos `FV-*` → `INST-*`;
- ejemplos `INV-FV-*` → `ACT-*`;
- inversor FV → ejemplos genéricos de bomba/cuadro;
- `equipo` visible de alta → `activo` donde corresponde.

### Control de diff

- un solo archivo;
- 20 adiciones;
- 20 eliminaciones;
- únicamente sustituciones de texto/defaults.

No se cambia la lógica de `createInstallation`, `createAsset` ni `createWorkOrder`.

## MOV-064 — Guards de regresión

**Estado:** COMPLETADO.

Archivos de test:

- `WorkOrderCreateWorkspace.test.tsx`;
- `workOrderCreateDomainGuard.test.ts`;
- `quickWorkOrder.test.ts`.

El guard impide que reaparezcan en creación real frases como:

- `Alta rápida de instalación FV`;
- `fotovoltaica` como default visible;
- `Inversor FV`;
- `inversor_fotovoltaico`;
- `INV-FV-*`;
- `Revisar inversor FV de cubierta`.

También exige:

- `Nueva OT rápida`;
- `Activo no obligatorio`;
- `Sin activo identificado`;
- selector Rápida/Avanzada;
- integración de `App.tsx` a través del workspace.

**Quality 265:** success completo.

## MOV-065 — Revisión global de diff

**Estado:** COMPLETADO.

Base:

`b2856aa069d51f8b2149b708570692846dfce103`

Archivos finales antes de esta continuación documental: 10.

Cambios principales:

- documentación OT-03;
- `App.tsx`: 1+1 líneas;
- formulario avanzado: 20+20 líneas de copy/default;
- formulario rápido nuevo;
- workspace nuevo;
- schema/mapper rápidos;
- tests de contrato/UI/dominio.

Confirmado fuera del diff:

- `supabase/migrations/**`;
- `supabase/tests/**`;
- SQL;
- RLS;
- RPC;
- Storage;
- workflows;
- Docker;
- Cloudflare;
- mini PC;
- producción;
- `isivoltpro-platform`.

## MOV-066 — PR OT-03

PR #46 ya fue abierta tempranamente como Draft para CI incremental.

Debe actualizarse ahora con el estado final.

## MOV-067 — CI final

**SIGUIENTE.**

Después de este commit documental, el HEAD funcional/documental queda congelado.

Debe ejecutarse Quality sobre el SHA exacto final:

- install;
- branding guard;
- typecheck;
- lint;
- tests;
- build.

## MOV-068 — Ready

Solo si:

- mismo HEAD;
- Quality final success;
- mismos archivos revisados;
- `mergeable=true`.

## MOV-069 — Squash & Merge

Solo después de MOV-068.

## MOV-070 — OT-04

Nueva rama exclusivamente desde el nuevo `main`.

Antes de fijar la feature concreta, revisar el estado de módulos de instalación/sistemas y seleccionar el siguiente bloque de mantenimiento sin duplicar funciones existentes.

## Criterios de aceptación — resultado

1. Nueva OT abre Rápida por defecto: **CUMPLIDO**.
2. Activo no obligatorio: **CUMPLIDO**.
3. Técnico no obligatorio: **CUMPLIDO**.
4. Fechas no obligatorias: **CUMPLIDO**.
5. Misma RPC existente: **CUMPLIDO**.
6. Borrador: **CUMPLIDO**.
7. Continúa por el flujo normal tras crear: **CUMPLIDO**.
8. Modo avanzado disponible: **CUMPLIDO**.
9. Contexto precargado conserva Avanzada: **CUMPLIDO**.
10. Sin branding FV visible en creación real: **CUMPLIDO y protegido por test**.
11. Sin DB/RLS/RPC nuevos: **CUMPLIDO**.
12. CI final verde antes de merge: **PENDIENTE MOV-067**.
