# IsiVoltPro OT — OT-02 · Continuación de bitácora

Fecha: 2026-08-10
Rama: `refactor/ot-capabilities-access`
PR de trabajo: #45 (Draft)

## MOV-042 — Auditoría de checks por rol

**Estado:** COMPLETADO para el núcleo real.

Fuentes directas revisadas:

- `src/App.tsx`;
- `src/AuthApp.tsx`;
- `src/features/technicians/technicianAccess.ts`;
- `src/features/clients/clientAccess.ts`.

Hallazgos clave:

- `admin_cliente` y `coordinador` comparten gestión operativa OT;
- solo `admin_cliente` gestiona usuarios;
- solo `admin_cliente` invita técnicos;
- solo `admin_cliente` edita clientes;
- `coordinador` sí puede consultar clientes/técnicos y gestionar OT/plantillas;
- `tecnico` y `tecnico_externo` usan navegación/ejecución técnica;
- `cliente_lectura` conserva dashboard/órdenes/planificación sin módulos administrativos;
- rol desconocido no debe recibir capabilities;
- la galería de instalación permitía gestión a administrador y coordinador, por lo que se añadió una capability propia para preservar esa paridad.

Contrato detallado: `docs/OT_02_ROLE_CAPABILITY_MATRIX.md`.

---

## MOV-043 — Capa pura de capabilities

**Estado:** COMPLETADO.

Archivo:

`src/auth/capabilities.ts`

Commit inicial:

`2a4f449e28a0d2e0f2f473d3cbb7f952c1ba294c`

Ampliación de paridad:

`7d6c439baca20bd7b28cf1d4e259ecd6a41f941c`

Incluye:

- roles legacy conocidos;
- tipo `OtCapability`;
- lista de capabilities;
- mapa role → capabilities;
- `isLegacyOtRole`;
- `capabilitiesForRole`;
- `hasCapability`;
- deny-by-default;
- `installations.evidence.manage` para administrador y coordinador.

No depende de React ni Supabase.

---

## MOV-044 — Tests de paridad

**Estado:** COMPLETADO y validado por CI.

Archivo:

`src/auth/capabilities.test.ts`

Commits:

- `4571c7fb7c13df556e179873751cceb527bf65d6`;
- `5a4ce173105d9c5eea2aeaa22fc8fe77f3c1c00f`.

Protege:

- matriz exacta por rol;
- diferencias admin/coordinador;
- ejecución técnica declarada;
- cliente lectura;
- deny-by-default;
- gestión de evidencias de instalación por admin/coordinador.

---

## MOV-046 — Adaptador de técnicos

**Estado:** COMPLETADO.

Archivo:

`src/features/technicians/technicianAccess.ts`

Commit:

`cecb3d9a73fc2a89c3c851bdcf82e35413ffd1d9`

Cambio:

Los helpers públicos conservan nombre/firma, pero internamente consultan capabilities:

- `isTechnicianRole` → `technician_workspace.read`;
- `canAccessTechnicianAdministration` → `technicians.read`;
- `canManageTechnicianInvitations` → `technicians.invite`.

---

## MOV-047 — Adaptador de clientes

**Estado:** COMPLETADO.

Archivo:

`src/features/clients/clientAccess.ts`

Commit:

`bcafdfeb5d05df773d7d419df0c66b29774cfe76`

Cambio:

- `canAccessClientNavigation` → `clients.read`;
- `canManageClientRecords` → `clients.manage`.

La API pública permanece igual.

---

## Tests adicionales de adaptadores

Archivo:

`src/auth/accessAdapters.test.ts`

Commit:

`d5b468fcdfe021119e96de442ca4f0761c746b23`

Valida la paridad legacy de los helpers existentes.

---

## PR #45 — Apertura temprana para control intermedio

Estado actual: **Draft**.

Motivo original:

Validar la nueva capa de capabilities antes de modificar consumidores grandes.

La PR se mantendrá Draft hasta completar revisión global, CI final y control de paridad.

---

## CI intermedio OT-02A

### Quality run 247

HEAD:

`d5b468fcdfe021119e96de442ca4f0761c746b23`

Resultado:

- install ✅
- branding ✅
- typecheck ✅
- lint ✅
- tests ✅
- build ✅

### Quality run 248

HEAD:

`95d82db2d0c7c2bc005e7eb0c6ef25da1204413e`

Resultado: `success`.

Conclusión: la base arquitectónica y documental estaba estable antes de migrar consumidores grandes.

---

## MOV-045 — Migrar navegación/acciones principales de `App.tsx`

**Estado:** COMPLETADO en dos pasos y validado por CI.

### MOV-045A — eliminar check directo de roles

Commit:

`8d938ba66cb3e7a208df16846aa4c6c9a0ea5ab4`

Cambio inicial:

- se importa `hasCapability`;
- desaparece la lista directa `admin_cliente/coordinador` del helper manager;
- diff inmediato verificado: 3 líneas en `App.tsx`.

CI:

Quality run 251 → `success`.

### MOV-045B — separar acciones por capability concreta

Commit:

`1a6385ef30b795ced4de3e1e6d2a553d52dd821a`

Cambios verificados mediante patch de PR:

- crear OT → `work_orders.create`;
- asignar/reasignar → `work_orders.assign`;
- revisar → `work_orders.review`;
- validar → `work_orders.validate`;
- anular → `work_orders.cancel`;
- auditoría → `work_orders.audit.read`;
- plantillas → `work_order_templates.manage`;
- evidencias de instalación → `installations.evidence.manage`;
- acceso a clientes/técnicos continúa mediante adaptadores capability-backed.

El diff del commit modifica únicamente autorización/UI en `src/App.tsx`.

No se modifican:

- estados OT;
- mutaciones;
- repositorios;
- consultas Supabase;
- lógica de datos;
- RPC.

CI:

Quality run 252 → `success`.

---

## MOV-049 — Migrar gestión de usuarios en `AuthApp.tsx`

**Estado:** COMPLETADO.

Commit:

`d1e94117afad8b13aa4b91aefc5448bf6b652ae2`

Cambio exacto:

```text
role === 'admin_cliente'
→ hasCapability(role, 'users.manage')
```

Además se añade el import de `hasCapability`.

Comparación inmediata contra el commit anterior:

- `src/AuthApp.tsx`;
- 2 adiciones;
- 1 eliminación;
- 3 líneas totales modificadas.

Confirmado sin cambios:

- login;
- recuperación;
- carga de identidad;
- membresías;
- invitaciones RPC;
- aceptación de invitaciones;
- sesión Supabase.

---

## MOV-048 — Acciones críticas

**Estado:** COMPLETADO para las acciones administrativas incluidas en OT-02.

Matriz verificada:

| Acción | Capability UI |
|---|---|
| Nueva OT | `work_orders.create` |
| Asignar/reasignar | `work_orders.assign` |
| Revisar/corrección | `work_orders.review` |
| Validar | `work_orders.validate` |
| Anular | `work_orders.cancel` |
| Ver auditoría | `work_orders.audit.read` |
| Plantillas | `work_order_templates.manage` |
| Evidencias de instalación | `installations.evidence.manage` |
| Clientes lectura | `clients.read` |
| Clientes edición | `clients.manage` |
| Técnicos lectura | `technicians.read` |
| Invitar técnicos | `technicians.invite` |
| Usuarios | `users.manage` |

### Ejecución técnica

La capability `work_orders.execute` queda definida y probada en la matriz, pero OT-02 **no modifica la condición operativa existente de ejecución** (`técnico asignado + backend`) porque imponer un nuevo gate adicional podría cambiar un caso legacy no validado.

Esta decisión preserva el principio de OT-02: no ampliar ni reducir comportamiento operativo sin una fase específica.

---

## MOV-050 — Tests UI/consumidores de regresión

**Estado:** COMPLETADO en implementación; pendiente CI final del HEAD definitivo.

Archivo:

`src/auth/capabilityConsumers.test.ts`

Commit:

`5f047004bc5588ee8f7e9e16a9d66a4b12c20aca`

Protege:

- capabilities explícitas en `App.tsx`;
- ausencia del antiguo `isManagerRole`;
- ausencia de `role === 'admin_cliente'` en `AuthApp.tsx`;
- `users.manage` para gestión de usuarios;
- permanencia de los flujos de login, sesión e invitaciones.

---

## MOV-051 — Próximo movimiento

**Estado:** SIGUIENTE.

Congelar el alcance funcional de OT-02 y revisar el diff completo de PR #45.

Confirmar explícitamente ausencia de cambios en:

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

---

## MOV-052 — Actualizar PR OT-02

Tras MOV-051:

- actualizar cuerpo con estado final;
- mantener Draft durante CI final.

## MOV-053 — CI final

Requerido sobre el HEAD definitivo:

- install;
- branding guard;
- typecheck;
- lint;
- tests;
- build.

## MOV-054 — Revisión final / Ready

Solo si:

- mismo HEAD validado;
- CI verde;
- diff exacto;
- ningún permiso ampliado accidentalmente.

## MOV-055 — Squash & Merge OT-02

Solo con todos los controles verdes.

## MOV-056 — Preparar OT-03

Nueva rama únicamente desde el nuevo `main`.

OT-03 prevista: **creación rápida/simplificada de OT**.

---

## Estado de seguridad actual

- DB: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- migraciones: sin cambios;
- Storage: sin cambios;
- mini PC: sin cambios;
- producción: sin cambios;
- Platform: sin cambios;
- PR #45: Draft, no fusionar hasta completar MOV-051…MOV-055.
