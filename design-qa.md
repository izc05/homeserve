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
