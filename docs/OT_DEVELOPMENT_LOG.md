# IsiVoltPro OT — Registro detallado de desarrollo

Este archivo registra cada movimiento relevante realizado durante la evolución de `izc05/homeserve` hacia **IsiVoltPro OT**.

## Formato obligatorio de cada movimiento

Cada entrada debe indicar:

- fecha y hora;
- repositorio;
- rama;
- objetivo;
- estado inicial;
- archivos revisados;
- archivos modificados;
- migraciones;
- permisos/RLS afectados;
- pruebas ejecutadas;
- resultado;
- riesgos;
- rollback;
- commit(s);
- PR;
- decisión;
- siguiente paso.

---

## MOV-000 — Replanteamiento del producto

**Fecha:** 2026-08-10

**Repositorio:** `izc05/homeserve`

**Situación:** el repositorio histórico se llama `homeserve`, pero el producto objetivo es IsiVoltPro. Se decide separar claramente tres responsabilidades del futuro ecosistema:

- IsiVoltPro OT = ejecutar y documentar trabajos;
- IsiVoltPro Mantenimiento = controlar técnicamente instalaciones y planes de mantenimiento;
- IsiVoltPro Activos = identificación física/documental mediante QR/NFC;
- IsiVoltPro Platform = núcleo común y unificación.

**Decisión:** HomeServe deja de ser la identidad objetivo. No es obligatorio conservar la marca ni el concepto funcional HomeServe.

**Impacto:** documental/arquitectónico. Sin cambios funcionales de producción.

**Rollback:** no necesario; no se modificó producción.

---

## MOV-001 — Rama documental anterior

**Fecha:** 2026-08-10

**Rama:** `feat/isivoltpro-maintenance-v2`

**Objetivo original:** ampliar el producto hacia mantenimiento completo.

**Resultado:** tras redefinir el ecosistema, esa dirección deja de ser la adecuada para OT porque Mantenimiento será una aplicación separada.

**Decisión:** la rama queda como referencia histórica/superseded. No se utilizará como base del desarrollo funcional de OT.

**Motivo:** evitar mezclar en OT responsabilidades de Activos y Mantenimiento.

---

## MOV-002 — Auditoría inicial de `main`

**Fecha:** 2026-08-10

**Rama auditada:** `main`

**Archivos/documentos revisados:**

- `README.md`;
- `AGENTS.md`;
- `docs/PRODUCT_SPEC.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DATABASE.md`;
- `docs/ROADMAP.md`;
- `docs/UI_FLOWS.md`;
- `package.json`;
- estructura `src/`;
- estructura `src/features/`;
- inicio de `src/App.tsx`;
- estructura `src/features/assets/`.

**Hallazgos:**

1. `package.json` ya usa el nombre `isivoltpro-ot`.
2. `AGENTS.md` establece que el producto gestiona órdenes de trabajo y no debe añadir módulos generales innecesarios.
3. La especificación actual de OT contiene una buena base de creación, asignación, checklist, ejecución, revisión y PDF.
4. El modelo de datos ya contiene `work_order_visits`, fotos, materiales, firmas, informes, eventos y auditoría.
5. `work_orders.assigned_to` refleja un modelo principalmente de un técnico por OT y deberá evolucionar.
6. `src/App.tsx` tiene más de 50 KB y concentra navegación, reglas y parte importante de las vistas.
7. La navegación secundaria contiene `Equipos FV`, una especialización que no debe formar parte del producto OT genérico.
8. El frontend contiene roles hardcodeados como `admin_cliente` y `coordinador`.
9. Existen features `assets` y `clients` dentro del repositorio. Se revisarán para decidir qué queda como contexto mínimo y qué responsabilidad debe delegarse a Platform/Activos.
10. No se debe reconstruir la lógica buena ya existente sin motivo; se priorizará refactor incremental.

**Cambios funcionales:** ninguno.

**Pruebas:** no aplican todavía; auditoría documental/código leído.

**Riesgo:** bajo.

---

## MOV-003 — Creación de rama maestra de planificación OT

**Fecha:** 2026-08-10

**Rama:** `docs/isivoltpro-ot-execution-master`

**Base:** `main`

**Objetivo:** mantener la nueva planificación OT separada de la rama anterior de Mantenimiento.

**Cambio:** creación de la rama, sin modificar `main`.

**Riesgo:** ninguno para producción.

---

## MOV-004 — Plan Maestro de Ejecución OT

**Fecha:** 2026-08-10

**Rama:** `docs/isivoltpro-ot-execution-master`

**Archivo añadido:** `docs/OT_EXECUTION_MASTER_PLAN.md`

**Commit:** `abe1d35ef816702179246aaaf8cf8302fdc36c44`

**Contenido principal:**

- frontera OT/Mantenimiento/Activos/Platform;
- contrato de IDs futuro;
- funcionamiento con instalaciones incompletas;
- flujo objetivo de OT;
- estrategia Git;
- fases OT-00 a OT-13;
- prioridades P0/P1/P2;
- hallazgos confirmados;
- política de no interferencia con Platform;
- Definition of Done.

**Cambios funcionales:** ninguno.

**Migraciones:** ninguna.

**RLS/permisos:** sin cambios.

**Producción/mini PC:** sin cambios.

**Rollback:** eliminar el archivo o abandonar la rama.

---

## MOV-005 — Registro detallado de desarrollo

**Fecha:** 2026-08-10

**Rama:** `docs/isivoltpro-ot-execution-master`

**Archivo añadido:** `docs/OT_DEVELOPMENT_LOG.md`

**Commit:** `d28a052b9f6edf20ff6d565ad890ed34d33c0645`

**Objetivo:** disponer de una bitácora única y auditable de cada paso futuro.

**Regla futura:** ninguna fase se dará por terminada sin actualizar este registro.

---

## MOV-006 — Auditoría OT-00 ampliada

**Fecha:** 2026-08-10

**Estado:** EN CURSO

**Rama de documentación:** `docs/isivoltpro-ot-execution-master`

**Nuevas áreas revisadas:**

- estructura completa de `src/features/work-orders`;
- listado de APIs OT;
- listado de componentes OT;
- estructura de `src/features/clients`;
- estructura de `src/features/assets`;
- migraciones Supabase relacionadas con OT, mantenimiento programado e histórico de activo.

**Hallazgos añadidos:**

1. `work-orders` ya está razonablemente separado en `api`, `components`, `domain`, `forms`, `types` y `demo`.
2. existen pruebas junto a gran parte de APIs y componentes OT; se conservará esa filosofía.
3. se confirma lógica específica de mantenimiento programado dentro de OT: repositorio frontend y varias migraciones.
4. se confirma histórico de activo generado a partir de OT validadas.
5. mantenimiento programado se clasifica como MOVE funcional hacia IsiVoltPro Mantenimiento, manteniendo compatibilidad temporal.
6. histórico maestro de activo se clasifica como BRIDGE hacia Activos/Mantenimiento.
7. `clients` contiene una feature completa y deberá transformarse en acceso/adaptador a datos compartidos, no seguir creciendo como catálogo maestro dentro de OT.
8. `AssetsWorkspace` no debe ser un módulo principal de OT; OT conservará solo selección/resumen/referencia de activo.

**Documento creado:** `docs/OT_AUDIT_MATRIX.md`

**Commit:** `73cfc7f36066c92d0100ae8298db98da4b7967f1`

**Matriz:** KEEP / REFACTOR / BRIDGE / MOVE / REMOVE.

**Cambios funcionales:** ninguno.

**Migraciones nuevas:** ninguna.

**RLS/permisos:** sin cambios.

**Pruebas ejecutadas:** no aplican todavía porque no se ha modificado código funcional.

**Producción/mini PC:** sin cambios.

**Riesgo:** bajo.

**Rollback:** abandonar la rama documental.

**Estado de rama antes de esta actualización:** 3 commits por delante de `main`, 0 por detrás; solo tres archivos documentales nuevos.

**Siguiente paso:** terminar la auditoría de máquina de estados, schemas, técnicos, dashboard/planificación, CI y funciones/RPC antes de cerrar OT-00.

---

# Próximos movimientos previstos

## MOV-007 — Documento de contrato de integración OT

Crear borrador con:

- IDs externos;
- capabilities necesarias;
- deep links;
- eventos de entrada/salida;
- estrategia de compatibilidad con Supabase actual;
- reglas para futura sustitución por Platform.

## MOV-008 — Cierre documental OT-00

Antes de código funcional:

- completar matriz de auditoría;
- actualizar especificación;
- actualizar arquitectura;
- actualizar roadmap;
- actualizar flujos UI;
- dejar PR documental para revisión.

## MOV-009 — Primera rama funcional

Solo después de OT-00 validada.

Candidato inicial: `refactor/ot-identity-domain-cleanup`.

Objetivo previsto:

- eliminar `Equipos FV` como navegación OT;
- conservar referencia genérica a activos;
- retirar restos de marca HomeServe visibles;
- mantener compatibilidad y tests.
