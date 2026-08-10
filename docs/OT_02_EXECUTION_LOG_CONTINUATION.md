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
- rol desconocido no debe recibir capabilities.

Contrato detallado: `docs/OT_02_ROLE_CAPABILITY_MATRIX.md`.

---

## MOV-043 — Capa pura de capabilities

**Estado:** COMPLETADO.

Archivo:

`src/auth/capabilities.ts`

Commit:

`2a4f449e28a0d2e0f2f473d3cbb7f952c1ba294c`

Incluye:

- roles legacy conocidos;
- tipo `OtCapability`;
- lista de capabilities;
- mapa role → capabilities;
- `isLegacyOtRole`;
- `capabilitiesForRole`;
- `hasCapability`;
- deny-by-default.

No depende de React ni Supabase.

---

## MOV-044 — Tests de paridad

**Estado:** COMPLETADO y validado por CI intermedio.

Archivo:

`src/auth/capabilities.test.ts`

Commit:

`4571c7fb7c13df556e179873751cceb527bf65d6`

Protege:

- matriz exacta por rol;
- diferencias admin/coordinador;
- ejecución técnica;
- cliente lectura;
- deny-by-default.

---

## MOV-046 — Adaptador de técnicos

**Estado:** COMPLETADO en implementación; pendiente reconfirmación en CI final del HEAD definitivo.

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

**Estado:** COMPLETADO en implementación; pendiente reconfirmación en CI final del HEAD definitivo.

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

Estado: **Draft**.

Motivo:

Validar la nueva capa de capabilities antes de modificar consumidores grandes.

La PR declara expresamente que no puede fusionarse hasta completar OT-02.

---

## CI intermedio OT-02A

**Workflow:** Quality run 247

**HEAD:** `d5b468fcdfe021119e96de442ca4f0761c746b23`

Resultado:

- install ✅
- branding ✅
- typecheck ✅
- lint ✅
- tests ✅
- build ✅

Conclusión: `success`.

La base arquitectónica está validada.

---

## MOV-045 — Migrar navegación/acciones principales de `App.tsx`

**Estado:** PENDIENTE; próximo bloque funcional.

Checks a sustituir cuidadosamente:

- local `isManagerRole`;
- `canManage` general;
- visibilidad de Nueva OT;
- asignación;
- revisión;
- validación;
- anulación;
- carga de auditoría;
- configuración de plantillas;
- navegación técnico/administrativa.

### Regla de ejecución

`App.tsx` es un archivo grande (>50 KB). No se realizará un reemplazo masivo si no puede garantizarse una edición controlada y una revisión exacta del diff.

Después de editarlo:

1. comparar archivo contra `main`;
2. verificar que solo cambian checks de autorización frontend;
3. no modificar lógica de OT;
4. ejecutar CI antes de seguir.

---

## MOV-049 — Migrar gestión de usuarios en `AuthApp.tsx`

**Estado:** PENDIENTE tras `App.tsx`.

Cambio objetivo mínimo:

```text
role === 'admin_cliente'
→ hasCapability(role, 'users.manage')
```

No se modificarán:

- login;
- recuperación;
- carga de identidad;
- membresías;
- invitaciones RPC;
- sesión Supabase.

`AuthApp.tsx` también es grande, por lo que se aplicará la misma disciplina de diff mínimo.

---

## MOV-048 — Acciones críticas

**Estado:** PENDIENTE tras migrar consumidores.

Matriz a verificar:

| Acción | Capability UI esperada |
|---|---|
| Nueva OT | `work_orders.create` |
| Asignar/reasignar | `work_orders.assign` |
| Ejecutar | `work_orders.execute` + técnico asignado + backend |
| Revisar | `work_orders.review` |
| Validar | `work_orders.validate` |
| Anular | `work_orders.cancel` |
| Ver auditoría | `work_orders.audit.read` |
| Plantillas | `work_order_templates.manage` |
| Clientes lectura | `clients.read` |
| Clientes edición | `clients.manage` |
| Técnicos lectura | `technicians.read` |
| Invitar técnicos | `technicians.invite` |
| Usuarios | `users.manage` |

---

## MOV-050 — Tests UI de regresión

**Estado:** PENDIENTE.

Se añadirán tras migrar consumidores para comprobar visibilidad por rol/capability.

---

## MOV-051…MOV-056 — Futuro de la fase

1. cerrar migración de consumidores;
2. pruebas UI;
3. diff completo;
4. actualizar PR #45;
5. Quality final con HEAD definitivo;
6. revisar mergeable/changed files;
7. Ready for review;
8. Squash & Merge;
9. verificar nuevo `main`;
10. crear OT-03 desde ese `main`;
11. OT-03 prevista: creación rápida/simplificada de OT.

## Estado de seguridad actual

- DB: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- migraciones: sin cambios;
- Storage: sin cambios;
- mini PC: sin cambios;
- producción: sin cambios;
- Platform: sin cambios;
- PR #45: Draft, no fusionar todavía.
