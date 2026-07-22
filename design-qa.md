# Premium OT admin — design QA

## Comparison target

- Source visual truth: `C:\Users\ISICIO\Downloads\ChatGPT Image 21 jul 2026, 06_02_20.png`
- Browser-rendered implementation: `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\premium-ot-admin-desktop-1440x1024.png`
- Responsive evidence: `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\premium-ot-admin-tablet-1024x768.png`, `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\premium-ot-admin-mobile-390x844.png`, `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\premium-ot-admin-mobile-lower.png`, `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\premium-ot-admin-mobile-bottom.png`
- Primary state: real-data fixture matching `OT-2026-00003`, `EN_CURSO`, priority `Media`, client `Cliente Solar E2E`, installation `Cubierta E2E`, technician `Técnico E2E Ficticio`, with the four validated audit events.
- Viewports: 1440×1024, 1024×768 and 390×844.

## Evidence and review

The source and the desktop implementation were opened and compared at the same 1440×1024 content viewport. The focused comparison covered the navy record header, KPI strip, next-action panel, tab row, two-column summary and compact audit timeline. The tablet and mobile captures were then reviewed for wrapping, touch target size, complete lower-page content and page overflow.

The local browser console was checked during the rendered pass: no application errors or failed requests were observed. Only the standard Vite connection messages, React DevTools notice and React Router future-flag warnings were present.

Required fidelity surfaces:

- Fonts and typography: the existing product sans stack is retained; the hierarchy, uppercase red kicker, large OT code, compact labels and readable empty states follow the source hierarchy without truncating long values.
- Spacing and layout rhythm: header → KPI strip → next action → tabs → summary → timeline follows the source order, with responsive grids and preserved 44px control heights.
- Colors and visual tokens: navy header, red primary action/accent, white cards, muted slate text and amber status/priority chips match the selected direction with accessible text/icon pairings.
- Image quality and asset fidelity: the reference has no required photographic or decorative raster asset in the administrative ficha. Existing Lucide icons are used for semantic UI affordances; no mockup-only artwork or invented image was introduced.
- Copy and content: visible OT, client, installation, status, priority and audit values come from the real data shape. Missing location, asset, contact and description use explicit empty states. The footer is exactly `Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro`.

## Findings

No actionable P0, P1 or P2 differences remain. The mockup's mutating `Registrar avance` control is intentionally replaced by the existing safe `Nueva relacionada` action and an informational `Completar ejecución` next-action label, per scope and data-safety requirements. Tabs are real keyboard-navigable controls; Evidencias and Administración are read-only/informative.

The premium component is selected only for the administrator view. The existing technician detail rendering remains the path for technician sessions, so the second ficha is not redesigned in this phase.

## Responsive checks

- 1440×1024: no document overflow; header, KPI strip, summary columns and four-event timeline are visible in the expected desktop rhythm.
- 1024×768: no document overflow (`scrollWidth` 1009 ≤ 1024); the 84px icon rail replaces the full sidebar, while header actions, KPIs and the two-column summary remain legible.
- 390×844: no horizontal page overflow (`scrollWidth` 375 ≤ 390); the header is 204px high (including its compact controls), the back control and status/priority chips remain 44px tall, KPI cards are a two-by-two grid, and the next-action panel keeps the strongest visual emphasis. Tabs wrap into two rows instead of exposing a horizontal scrollbar; lower and bottom captures cover installation context, audit timeline, requirements and the exact footer.

## Comparison history

1. Initial implementation review identified the need for viewport-specific captures and an explicit empty-state treatment. The component already had the required responsive breakpoints and safe action copy; final viewport captures were taken at all three requested sizes.
2. Tablet review identified excess navigation width; a scoped 84px icon rail was added only when the premium OT page is present.
3. Mobile review identified a visible tab-strip scrollbar; the five tabs now wrap into a keyboard-accessible two-row grid with 48px controls. The final pass found no P0/P1/P2 defect; remaining differences are intentional product-scope constraints documented above.

## Implementation checklist

- [x] Header, KPIs, next action, tabs, summary, installation/technician context, timeline and footer implemented.
- [x] Real-data and missing-data states verified.
- [x] Keyboard tab navigation and visible focus styles implemented.
- [x] Desktop, tablet and mobile captures reviewed.
- [x] Five tabs verified by mouse and keyboard (Home, four ArrowRight steps, End and Home); each selected panel contained the expected copy.
- [x] Mobile lower-page captures include installation, history, requirements and footer.
- [x] No mutating mockup-only controls enabled.

## Follow-up polish

The selected mockup contains richer installation contact/address data than the current schema exposes. Those fields can be added later through additive migrations and a separate installation-ficha phase; they are intentionally not fabricated here.

## Account dock mobile correction

- Root cause: `AccountDock` was fixed at `top: 78px` by the ≤900px auth breakpoint while `real-mobile-fixes.css` also applied `bottom: 92px` and `z-index: 79` at ≤760px. At 390×844 the two insets stretched the dock across most of the viewport, intercepting the ficha and tabs; the same mobile rules also hid the profile, organization and `Salir` content.
- Correction: the account area now uses a native `<details>/<summary>` disclosure. At mobile it participates in normal document flow after the ficha, retains identity, organization, `Usuarios` and `Salir`, and exposes 44px controls with visible focus. Desktop and tablet rules remain unchanged.
- Captures: `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\account-dock-fix-mobile-top-390x844.png`, `...\account-dock-fix-mobile-tabs-390x844.png`, `...\account-dock-fix-mobile-footer-390x844.png`, `...\account-dock-fix-tablet-1024x768.png`, `...\account-dock-fix-desktop-1440x1024.png`.
- Mobile QA: 390×844 retained the 204px premium header, all five 48px tabs, complete history/footer, and no horizontal overflow (`scrollWidth` 375). The disclosure opened and closed; `Usuarios` and `Salir` actions were exercised in the read-only QA harness. Tablet retained the 84px rail (`scrollWidth` 1009), and desktop kept the account dock hidden and the existing premium layout (`scrollWidth` 1425).
- Validation: `typecheck`, ESLint, Vitest (17 files / 93 tests), build and `git diff --check` passed. No application errors were emitted in the fresh visual QA pass.

final result: passed

## Premium dashboard administrativo

### Referencia y alcance

- Referencia visual interna: `PremiumWorkOrderDetail`, la pantalla premium `Mis OT`, los tokens globales y la identidad `HomeServe Operaciones` ya publicados.
- Pantalla sustituida: únicamente el dashboard administrativo de `src/App.tsx`; navegación, rutas, callbacks, consultas y flujo operativo permanecen intactos.
- Datos: el componente recibe exclusivamente `WorkOrderListItem[]`, `viewerName`, `openOrders` y `openDetail`. No consulta otra fuente, no fabrica SLA ni modifica órdenes.
- Foco determinista: estado `BLOQUEADA → FINALIZADA_TECNICO → EN_CURSO → ACEPTADA → ASIGNADA → BORRADOR`; en empate, prioridad `critica → urgente → alta → normal → baja`, conservando el orden recibido para empates completos.

### Comparación visual

- La cabecera marino recupera la jerarquía de la ficha premium con kicker rojo `Panel central`, saludo completo, descriptor y badges `Datos reales` / `OT visibles`.
- Los KPI usan el mismo lenguaje de tarjeta blanca, icono semántico y acento de color: abiertas, en curso, pendientes de validación y bloqueadas.
- `Siguiente actuación · En foco` conserva el protagonismo rojo de la siguiente acción de la ficha premium y abre la OT mediante el callback existente.
- El cuerpo se organiza en órdenes recientes, estados clave, carga por técnico y próximas OT planificadas. Cliente, instalación, técnico o planificación ausentes se muestran como estados vacíos explícitos.
- El pie permanece exactamente `Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro`.

### Responsive y accesibilidad

- 1440×1024: `scrollWidth 1425 ≤ 1440`; cabecera, cuatro KPI, foco y primer nivel de tarjetas conservan una composición de escritorio equilibrada.
- 1024×768: `scrollWidth 1009 ≤ 1024`; el shell usa rail real de 84 px (`grid-template-columns: 84px 924.8px`), libera ancho y mantiene legibles los KPI y el foco.
- 390×844: `scrollWidth 375 ≤ 390`; cabecera compacta, KPI 2×2, foco apilado, tarjetas recientes, estados, carga, planificación y footer quedan accesibles sin overflow horizontal.
- Todos los botones propios del dashboard miden al menos 44 px en los tres viewports. Son controles nativos, conservan orden de teclado y muestran outline visible (`solid`, 2.4 px en el pase de teclado).
- Consola visual: sin errores; únicamente mensajes normales de Vite/React durante el arnés local temporal.

### Evidencias

- `C:\Users\ISICIO\.codex\visualizations\2026\07\22\premium-admin-dashboard\premium-dashboard-desktop-1440x1024.png`
- `C:\Users\ISICIO\.codex\visualizations\2026\07\22\premium-admin-dashboard\premium-dashboard-tablet-1024x768.png`
- `C:\Users\ISICIO\.codex\visualizations\2026\07\22\premium-admin-dashboard\premium-dashboard-mobile-top-390x844.png`
- `C:\Users\ISICIO\.codex\visualizations\2026\07\22\premium-admin-dashboard\premium-dashboard-mobile-middle-390x844.png`
- `C:\Users\ISICIO\.codex\visualizations\2026\07\22\premium-admin-dashboard\premium-dashboard-mobile-bottom-390x844.png`

El arnés visual fue temporal y se eliminó antes de la validación final. No se ejecutó ninguna acción mutante ni se tocó Supabase.

final result: passed

## HomeServe co-branding — propuesta demostrativa

### Procedencia y tratamiento del activo

- Fuente pública: `https://www.homeserve.es/` y logo horizontal rojo publicado por HomeServe en `/-/media/feature/newcomponents/logo-rojo-horizontal.png?h=58&hash=523C090F343FD77FD6726571AEDF8EC6B9CA19EE&la=es-ES&w=198`.
- Copia local única: `public/brand/homeserve-logo-red.png`; la aplicación utiliza `BASE_URL + brand/homeserve-logo-red.png` y no depende de `homeserve.es` en tiempo de ejecución.
- Activo verificado: PNG de 198×58 px, 2.722 bytes, transparencia ARGB y SHA-256 `40E53D83DE09B5C0A5867932AD731216C523EE8B4EE559C95B436B03CF7AEAA1`. No se redibujó, recoloreó, recortó ni deformó.
- Uso de marca: propuesta demostrativa no oficial. HomeServe conserva la identidad principal; `Desarrollado por IsiVoltPro` queda como autoría secundaria y el distintivo `Demostración` hace explícito el alcance.

### Integración y accesibilidad

- `ProductBrand` centraliza logo, `HomeServe Operaciones`, `Gestión de órdenes de trabajo`, `Demostración`, `Desarrollado por IsiVoltPro` y el fallback accesible. Se reutiliza en acceso, navegación administrativa, cabecera móvil y cabecera técnica.
- El logo reserva siempre su relación 198:58 mediante atributos `width`/`height`, marcos dimensionados y `object-fit: contain`; `alt="HomeServe"` permanece disponible y el error de carga cambia a un fallback textual con el mismo nombre accesible.
- Tamaños de presentación verificados: acceso 152×45 px (136×40 px en móvil), navegación 118×35 px, rail premium tablet 62×20 px, cabecera móvil 70×22 px y cabecera técnica 112×40 px sobre soporte blanco.
- En móvil el nombre completo `HomeServe Operaciones` cabe sin elipsis (`clientWidth = scrollWidth = 132 px`), el menú mide 44×44 px y los controles del acceso tienen una altura mínima de 44 px.
- El título del documento es `HomeServe Operaciones · Gestión de órdenes de trabajo`. Manifest y metadatos de aplicación usan el mismo nombre.
- El pie permanece exactamente: `Aplicación demostrativa para HomeServe · Elaborada por IsiVoltPro`.

### Responsive y evidencias

- Escritorio 1440×1024: acceso y navegación administrativa sin overflow (`scrollWidth = 1440`); logo horizontal nítido y jerarquía completa.
- Tablet 1024×768: el acceso conserva las dos columnas; en pantallas premium el rail de 84 px reduce la marca a 62×20 px y oculta solo su copia redundante, sin overflow (`scrollWidth = 1024`).
- Móvil 390×844: acceso, topbar y cabecera técnica caben sin overflow horizontal (`scrollWidth ≤ clientWidth`); nombre, distintivo y pie siguen visibles.
- Capturas:
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-access-desktop-1440x1024.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-access-tablet-1024x768.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-access-mobile-390x844.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-navigation-desktop-1440x1024.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-navigation-tablet-1024x768.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\homeserve-brand-navigation-mobile-390x844.png`
- Consola: ninguna carga nueva produjo errores. El acceso conserva únicamente los dos avisos preexistentes de futuras opciones de React Router v7; no son una regresión de esta implementación.

### Validación

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (19 archivos / 104 pruebas)
- `npm run build` ✅
- `git diff --check` ✅
- No se modificaron datos, backend, Supabase, rutas funcionales, systemd ni servicios. El arnés visual local fue temporal y se eliminó antes de esta revisión final.

final result: passed

## Premium Mis OT — zona técnica

### Alcance y datos

- Pantalla revisada: `Mis OT` de `TechnicianMobileWorkspace`; la ejecución interior de la OT y la ficha administrativa no se modifican.
- Orden de foco: se conserva el orden recibido por `listAccessibleWorkOrders` (fecha prevista y creación) y se presenta como `Siguiente actuación · En foco`. No se inventa una prioridad de planificación.
- Consulta de solo lectura en la ficha administrativa: `OT-2026-00003` (creada 20/07/2026 21:14) y `OT-2026-00002` (creada 20/07/2026 20:14) están ambas en `EN CURSO`, con prioridad `Media`, cliente `Cliente Solar E2E`, instalación `Cubierta E2E`, técnico `Técnico E2E Ficticio` y sin fecha prevista/límite. Por tanto, el conjunto técnico real produce `Pendientes 0 · Hoy 0 · Urgentes 0 · En curso 2`.
- La discrepancia anterior (una urgente y `OT-2026-00002` con prioridad urgente, además de `Cliente no disponible`) procedía exclusivamente del arnés QA temporal que se usó para la primera captura: incluía una OT de fixture con `priority: 'urgente'` y `clientName: null`. Ese archivo fue eliminado y nunca participa en producción. El repositorio real ya devuelve `clientName` desde `clientes.nombre`; la corrección visible consiste en renderizar ese dato también en las tarjetas/tabla, dejando `Cliente no disponible` solo cuando el valor recibido es nulo.
- Evidencia visual local de solo lectura tras la corrección, usando los valores reales confirmados en la ficha administrativa:
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\technician-mis-ot-desktop-1440x1024.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\technician-mis-ot-tablet-1024x768.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\technician-mis-ot-mobile-top-390x844.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\technician-mis-ot-mobile-middle-390x844.png`
  - `C:\Users\ISICIO\Documents\Codex\2026-07-20\files-mentioned-by-the-user-continuaci\outputs\technician-mis-ot-mobile-bottom-390x844.png`

### Comparación final

- Cabecera azul oscuro con `Mis OT`, identidad del técnico únicamente cuando está disponible y pie exacto de IsiVoltPro.
- KPIs de Pendientes, Hoy, Urgentes y En curso conservan los contadores derivados de `groupTechnicianOrders` sobre el mismo conjunto recibido que alimenta la cola: `0 / 0 / 0 / 2` en las OT E2E actuales; cada tarjeta también actúa como filtro.
- El orden común en los tres viewports es ahora `KPIs → filtros → Siguiente actuación · En foco → Cola en curso → vista seleccionada`. El filtro seleccionado queda reflejado por `aria-pressed`, el contador y el encabezado de la vista.
- `Cola en curso` es una tabla compacta en escritorio/tablet y se transforma en tarjetas apiladas en móvil. `Abrir ejecución` sigue llamando al callback `open` existente y no ejecuta aceptación, inicio ni finalización durante QA.
- La cola se etiqueta explícitamente como `Bloque independiente del filtro`; permanece visible aunque se seleccione otra vista para no confundir el bloque operativo activo con el resultado filtrado.
- Los seis filtros existentes permanecen como botones nativos de 44px, con `aria-pressed`, foco visible y orden de teclado natural. Se verificaron por interacción táctil y se inspeccionaron sus nombres accesibles.
- Cliente, ubicación y fecha prevista ausentes se muestran como estados vacíos explícitos; cuando existen, cliente y prioridad se muestran sin sustitución por fallback. No se introducen teléfonos, direcciones, SLA, planificación ni prioridades inventadas.
- Tablet 1024×768: rail de 84px y contenido legible, sin compresión horizontal.
- Móvil 390×844: cabecera compacta, KPIs 2×2, cola en tarjetas, filtros 2×3, historial inferior/estado vacío y footer alcanzables sin overflow. `AccountDock` continúa fuera del contenido y en flujo normal según la corrección previa.
- Escritorio 1440×1024: cabecera, foco, cola y filtros visibles en una composición de tabla compacta; la acción primaria conserva el rojo reservado.

### Validación

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ (101 tests; incluye 8 pruebas de `TechnicianMobileWorkspace`, incluida la regresión de datos reales y contadores)
- `npm run build` ✅
- `git diff --check` ✅
- Consola del pase visual local: sin errores, warnings ni peticiones fallidas.
- No se ejecutaron acciones mutantes sobre ninguna OT y no se sincronizó el mini PC.

### Resultado

La iteración premium de `Mis OT` queda aprobada para escritorio, tablet y móvil dentro del alcance solicitado. La corrección mantiene intactos permisos, orden del repositorio, rutas, backend y acciones operativas; el siguiente paso de riesgo controlado es repetir el smoke visual con la sesión técnica real tras servir este bundle, sin cambiar el flujo operativo.

final result: passed
