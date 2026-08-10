# IsiVoltPro OT — Continuación de bitácora 2026-08-10

Este documento continúa `OT_DEVELOPMENT_LOG.md` para evitar reemplazos masivos del archivo durante OT-00.

## MOV-007 — Contrato de integración OT

**Fecha:** 2026-08-10

**Rama:** `docs/isivoltpro-ot-execution-master`

**Archivo:** `docs/OT_INTEGRATION_CONTRACT_DRAFT.md`

**Commit:** `6b51270c99e678e6a2f2ac881c014f5ac7b18617`

**Objetivo:** definir cómo OT se conectará con Platform, Activos, Mantenimiento, Almacén y apps técnicas sin acoplamiento directo a sus tablas.

**Incluye:** IDs comunes, capabilities, adapters, deep links, eventos, idempotencia, snapshots y estrategia de migración progresiva.

**Código funcional:** sin cambios.

**Producción:** sin cambios.

---

## MOV-008 — Auditoría de estados, formularios, técnicos y CI

**Fecha:** 2026-08-10

**Rama auditada:** `main`

**Hallazgos verificados:**

- máquina canónica de estados coherente;
- activo y técnico ya son opcionales en schema de creación;
- técnicos tienen feature propia pero roles hardcodeados;
- dashboard OT debe limitarse a operación de trabajos;
- `quality.yml` usa Node 22 + `npm ci`;
- `ci.yml` usa Node 20 + `npm install`;
- se recomienda consolidación futura en una PR separada.

**Matriz actualizada:** `docs/OT_AUDIT_MATRIX.md`

**Commit de ampliación:** `b8bb076e0b7b5504214d3add03b01182587cb2ce`

**Código funcional:** sin cambios.

---

## MOV-009 — Auditoría de migraciones/RPC actuales

**Fecha:** 2026-08-10

**Archivos clave revisados:**

- `20260719164210_work_order_security_normalization.sql`;
- `20260719182509_fix_report_version_lock_and_block_status.sql`;
- `20260721174937_harden_function_execute_privileges.sql`;
- `20260722062843_enforce_guided_work_order_completion_requirements.sql`;
- `workOrderLifecycle.ts`;
- `workOrderCommands.ts`.

**Resultado importante:**

Una migración antigua usaba estados legacy, pero las migraciones posteriores ya normalizan el backend a `BLOQUEADA`, `FINALIZADA_TECNICO` y `VALIDADA`. No se registra como fallo vigente.

**Seguridad verificada en repositorio:**

- `create_work_order` queda `SECURITY INVOKER` en migración posterior;
- validación de tenant/actor;
- generador de código aislado en esquema privado;
- ACL de funciones endurecida;
- cierre guiado validado en servidor.

**Deuda real detectada:** el texto de bloqueo reutiliza actualmente un campo de reasignación; se diseñará estructura de bloqueo propia en una fase posterior.

**Código/DB:** sin cambios.

---

## MOV-010 — Fugas de alcance verificadas

**Fecha:** 2026-08-10

**Hallazgos:**

- `workOrderCommands.ts` permite crear instalaciones y activos desde OT;
- `AssetsWorkspace` mantiene un módulo general de activos;
- la navegación incluye `Equipos FV`;
- existe motor de mantenimiento programado en OT.

**Decisiones:**

- mantener compatibilidad temporal;
- no ampliar estas funciones;
- activos maestros → IsiVoltPro Activos;
- clientes/instalaciones maestros → Platform;
- planes preventivos → IsiVoltPro Mantenimiento;
- OT conserva referencias y ejecución del trabajo.

**Código:** sin cambios.

---

## MOV-011 — Actualización de especificación funcional

**Archivo:** `docs/PRODUCT_SPEC.md`

**Commit:** `057604329e97c3f0d27895b60a7a11d45d49fa4b`

**Cambios documentados:**

- frontera del ecosistema;
- OT rápida y avanzada;
- activo opcional;
- equipo de trabajo;
- visitas/relevo;
- integración;
- QR/NFC desde Activos;
- eventos;
- materiales conectables a Almacén;
- fuera de alcance definitivo de OT.

---

## MOV-012 — Actualización de arquitectura

**Archivo:** `docs/ARCHITECTURE.md`

**Commit:** `c4af1f09a71aa76418d51bd4215aa6e20d17e160`

**Cambios documentados:**

- React 18 actual corregido en documentación;
- arquitectura incremental;
- capa de integrations/adapters;
- PlatformSessionContext;
- capabilities;
- directorios compartidos;
- eventos versionados;
- snapshots;
- reglas de seguridad y migración.

---

## MOV-013 — Sustitución del roadmap histórico

**Archivo:** `docs/ROADMAP.md`

**Commit:** `c6ab24472d1f99a970eb9c1a82163475612c578e`

**Resultado:** roadmap OT-00 a OT-13 alineado con el estado real del repositorio y la futura integración.

---

## MOV-014 — Actualización de flujos UI

**Archivo:** `docs/UI_FLOWS.md`

**Commit:** `67197191557c1e22957f57e992e4da9a0c1632b2`

**Resultado:** se documentan:

- OT rápida/avanzada;
- entrada desde Activos/QR/NFC;
- entrada desde Mantenimiento/apps técnicas;
- planificación;
- equipo/visitas;
- evidencias;
- relevo;
- cierre e integración.

---

## MOV-015 — README alineado con producto definitivo

**Archivo:** `README.md`

**Commit:** `78ed63388f4db7440a730e4d52c558c98c3a2986`

**Resultado:** el repositorio se declara temporalmente `homeserve`, pero el producto objetivo queda inequívocamente definido como IsiVoltPro OT.

**Regla:** este flujo no modifica `isivoltpro-platform`.

---

## MOV-016 — Intento de cierre sobre matriz grande

**Fecha:** 2026-08-10

**Acción:** se intentó reemplazar de una sola vez `OT_AUDIT_MATRIX.md` con la versión final consolidada.

**Resultado:** el conector GitHub bloqueó la escritura antes de aplicarla al no poder determinar el estado de seguridad de la solicitud.

**Impacto:** ninguno. El archivo no fue alterado por ese intento.

**Decisión:** no forzar el reemplazo; preservar la matriz como evidencia intermedia y crear un cierre separado.

---

## MOV-017 — Documento de cierre OT-00

**Archivo:** `docs/OT_00_AUDIT_CLOSEOUT.md`

**Commit:** `ae8710ea47cf0ff98e2eec3dcf0a67faf739bb68`

**Resultado:** auditoría OT-00 cerrada documentalmente con hallazgos verificados y alcance de la primera fase funcional.

**Código funcional:** sin cambios.

**Base de datos:** sin cambios.

**RLS:** sin cambios.

**Mini PC:** sin cambios.

**Platform:** sin cambios.

---

## MOV-018 — Verificación previa a PR

**Fecha:** 2026-08-10

**Comparación:** `main...docs/isivoltpro-ot-execution-master`

**Resultado:**

- rama por delante: 13 commits;
- rama por detrás: 0;
- archivos cambiados: 11;
- tipos de archivo: solo `README.md` y Markdown bajo `docs/`;
- código fuente: sin cambios;
- migraciones: sin cambios;
- configuración de despliegue: sin cambios.

**Conclusión:** apta para PR documental en borrador.

---

## MOV-019 — Próximo movimiento

1. abrir PR documental en modo borrador;
2. permitir que GitHub Actions valide la rama;
3. revisar resultado de CI;
4. no fusionar hasta confirmar que no hay cambios funcionales;
5. después crear `refactor/ot-identity-domain-cleanup` desde el `main` actualizado.
