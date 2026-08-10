# IsiVoltPro OT — OT-01 · Continuación de bitácora

Fecha: 2026-08-10
Rama: `refactor/ot-identity-domain-cleanup`
Base de fase: `main` @ `dc712b1974f81b52c7c8d1a1e73854d87760c376`

Este documento registra la ejecución real de los movimientos definidos en `OT_01_EXECUTION_LOG.md`.

---

## MOV-026 — Auditoría visible de `src/App.tsx`

**Estado:** COMPLETADO.

### Hallazgos

Se verificó directamente el archivo completo, sin confiar en el índice de búsqueda de GitHub, porque la búsqueda indexada no devolvía cadenas que sí existían en el blob.

Fugas de dominio encontradas:

- navegación secundaria `Equipos FV`;
- avatar de organización fijo `FV`;
- título interno `Equipos FV`;
- textos visibles `Equipo/Equipos` donde el concepto correcto para OT es `Activo/Activos`;
- vista interna `assets` existente;
- `isManagerRole` aún usa roles directos.

### Decisión

- retirar la navegación maestra de activos de OT;
- conservar temporalmente la vista/ruta interna `assets` para compatibilidad;
- no renombrar IDs, tablas, `assetId` ni APIs;
- no abordar todavía `isManagerRole` en esta fase.

**DB/RLS:** sin cambios.

---

## MOV-027 — Auditoría de branding y lenguaje sectorial

**Estado:** COMPLETADO.

### Método

Se revisaron directamente:

- `src/App.tsx`;
- `src/components/ProductBrand.tsx`;
- `src/DemoApp.tsx`;
- `src/features/demo/DemoAccessPanel.tsx`;
- `src/features/demo/DemoModuleScreens.tsx`;
- `src/features/demo/DemoPlanningScreen.tsx`;
- `src/features/demo/DemoTechnicianScreen.tsx`;
- `src/features/work-orders/demo/DemoCreateWorkOrder.tsx`;
- `src/features/work-orders/demo/DemoEditWorkOrder.tsx`;
- `src/features/work-orders/demo/PersistentWorkOrderDetailWorkspace.tsx`;
- `src/features/work-orders/demo/TechnicianExecutionPanel.tsx`.

### Resultado

`ProductBrand.tsx` ya era correcto: `IsiVoltPro OT` y descriptor genérico.

Se encontraron referencias visibles heredadas a:

- `Equipos FV`;
- `Fotovoltaica y mantenimiento`;
- `Presentación FV`;
- `Agenda FV`;
- `Planificación FV`;
- `Jornada FV`;
- `mantenimiento FV`;
- `Simulación FV`;
- `Edición FV`;
- `PARTE DE INTERVENCIÓN FV`;
- `SolarManten FV`.

### Compatibilidad preservada

IDs internos como:

- `demo-site-fv-jaen`;
- `demo-location-fv-new`;

se conservan en OT-01 porque no son visibles y cambiarlos podría invalidar memoria demo/local existente sin aportar valor funcional.

---

## MOV-028 — Nomenclatura genérica OT

**Estado:** COMPLETADO.

### Convención aplicada

- `Activo` / `Activos` cuando una OT referencia un equipo físico;
- `Instalación` para emplazamiento/contexto;
- `OT` / `Orden de trabajo` para el núcleo de ejecución;
- `mantenimiento multisector` cuando es necesario describir el producto;
- no se presenta Activos como módulo maestro dentro de OT.

### Regla técnica

Los nombres internos `assets`, `assetId`, `assetName`, etc. no se renombran en esta fase.

---

## MOV-029 — Retirar `Equipos FV` de navegación real

**Estado:** COMPLETADO.

**Archivo:** `src/App.tsx`

**Commit:** `401f839231afc19619dc81b540f11787f36067b6`

### Cambios

- se elimina `assets` de `secondaryNavigation`;
- se elimina `Equipos FV` de la navegación visible;
- avatar de organización deja de ser `FV` y usa iniciales reales de `tenantName`;
- referencias visibles pasan a `Activo/Activos`;
- la vista interna `assets` permanece para compatibilidad temporal.

### Verificación inmediata

Comparación del commit contra la base mostró solo 19 líneas reales modificadas en `App.tsx`, pese a que el archivo completo se actualizó mediante Contents API.

---

## MOV-030 — Neutralizar dominio visible y demo

**Estado:** COMPLETADO.

### Commits y archivos

- `fb61fb8e011e6aa4cebb3c3fe78ff42df2e0fd8e` — `src/DemoApp.tsx`;
- `077e9cf8b158a51fb8c30bb7dbfd4393bce1a87b` — `src/features/demo/DemoModuleScreens.tsx`;
- `1dca6ad5dfb7290a7b7326aea12512dca4b322b5` — `src/features/demo/DemoAccessPanel.tsx`;
- `87a5bd1838cf11039c8184ba6a99613a91c990f1` — `src/features/demo/DemoPlanningScreen.tsx`;
- `5ab28bd9842febce4ef1fa5207c94f4b21441bfd` — `src/features/demo/DemoTechnicianScreen.tsx`;
- `49a25cd7e3860caf2037351697db12995f380af2` — `src/features/work-orders/demo/DemoCreateWorkOrder.tsx`;
- `ff3fb670957d843988df74c7112c936c7ba9c614` — `src/features/work-orders/demo/DemoEditWorkOrder.tsx`;
- `c75800e90151d5f00a9ca804df140219eaa689d4` — `src/features/work-orders/demo/PersistentWorkOrderDetailWorkspace.tsx`.

### Resultado visible

La presentación pasa a describir:

- órdenes de trabajo multisector;
- mantenimiento técnico de cualquier instalación;
- activos vinculados como contexto;
- técnicos, planificación, evidencias, informes y trazabilidad.

### Demo de activos

La vista `DemoAssetsScreen` se conserva internamente para compatibilidad, pero se retira de:

- navegación de módulos;
- accesos rápidos del dashboard.

No se elimina el archivo ni sus datos en OT-01.

### Valores demo nuevos

Cuando no existe contexto previo:

- ubicación genérica: `Instalación demo · Sala técnica`;
- instalación genérica: `Instalación técnica demo`;
- ejemplos de trabajo: cuadro, bomba, climatizador o equipo;
- riesgos genéricos: EPIs, consignación, altura, zona energizada y bloqueo de equipos.

---

## MOV-031 — Revisión de identidad HomeServe visible

**Estado:** COMPLETADO para alcance OT-01.

### Resultado

`ProductBrand.tsx` ya usa IsiVoltPro OT.

El workflow `.github/workflows/quality.yml` contiene un guard que rechaza `HomeServe` visible en:

- `index.html`;
- `demo.html`;
- `public`;
- `src`.

No se modifica el workflow en OT-01.

La verificación definitiva se realizará en CI de la PR.

---

## MOV-032 — Frontera compatible de roles/capabilities

**Estado:** POSPUESTO A OT-02.

### Motivo

La auditoría confirma que `isManagerRole`, `technicianAccess` y varias pantallas todavía dependen de roles actuales.

Cambiar esa frontera en OT-01 ampliaría el alcance desde limpieza visual/dominio hacia autorización de interfaz.

### Decisión

OT-01 mantiene exactamente los permisos actuales.

OT-02 comenzará por:

1. inventario de decisiones por rol;
2. mapa role → capability de compatibilidad;
3. tests de capacidades;
4. sustitución incremental de checks frontend;
5. cero cambio de autoridad RLS hasta fase específica y validada.

---

## MOV-033 — Tests de regresión

**Estado:** PREPARADO; pendiente ejecución CI.

### Test 1

**Archivo:** `src/App.navigation.test.ts`

**Commit:** `5fa39089019e1b4989747d10eb00d3e7eefdefc2`

Protege:

- `assets` no aparece en navegación OT;
- `Equipos FV` no reaparece;
- navegación operativa principal/secundaria mantiene sus módulos esperados.

### Test 2

**Archivo:** `src/demo-domain-guard.test.ts`

**Commit:** `68d9266097e77a975848a96ccfcbb4220ba72fd9`

Protege frases visibles heredadas en las pantallas OT/demo accesibles y permite explícitamente IDs internos legacy no visibles.

---

## MOV-034 — Revisión global de diff

**Estado:** COMPLETADO antes de PR.

### Comparación

Base:

`dc712b1974f81b52c7c8d1a1e73854d87760c376`

Head lógico revisado:

`refactor/ot-identity-domain-cleanup`

### Archivos modificados

Solo:

- bitácora OT-01;
- 2 tests frontend;
- `src/App.tsx`;
- pantallas demo/OT relacionadas con identidad y terminología.

### Confirmado fuera del diff

- `supabase/migrations/**`;
- `supabase/tests/**`;
- SQL;
- RLS;
- funciones/RPC;
- Storage;
- workflows;
- Docker;
- Cloudflare;
- mini PC;
- `isivoltpro-platform`.

### Estado

Alcance funcional de OT-01: **CONGELADO**.

No se añadirán nuevas mejoras antes de CI salvo corrección de fallo detectado por revisión/pruebas.

---

## MOV-035 — Próximo movimiento

Abrir PR OT-01 en modo **Draft** para que GitHub ejecute `Quality`.

Controles requeridos:

1. instalación reproducible;
2. guard de branding;
3. typecheck;
4. lint;
5. tests existentes + nuevos;
6. build.

Si cualquier control falla:

- no marcar ready;
- inspeccionar log;
- corregir exclusivamente el fallo;
- volver a ejecutar CI;
- registrar el movimiento.

Si todos pasan:

- MOV-036 revisión visual/semántica;
- MOV-037 revisión del PR/diff;
- MOV-038 ready for review;
- MOV-039 Squash & Merge;
- MOV-040 preparar OT-02 desde el nuevo `main`.
