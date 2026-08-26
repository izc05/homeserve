# IsiVoltPro OT — OT-06 · Continuación de ejecución

Fecha: 2026-08-10
Rama: `feat/ot-multi-technician-visits-v1`
PR: #49 (Draft durante la ejecución)
Base: `main` @ `4605843d4b605cf4fa14b7e133ec79740fe1e140`

Este documento complementa `OT_06_EXECUTION_LOG.md` con los movimientos realmente implementados y validados.

---

## OT-06A — Participantes normalizados

### MOV-082 / MOV-083 — modelo e invariantes

**COMPLETADO.**

Se mantiene `ordenes_trabajo.assigned_to` como responsable principal por compatibilidad y se introduce `ot_participantes` para responsable/colaboradores.

Invariantes:

- un participante activo por OT+técnico;
- un responsable activo por OT;
- responsable técnico activo del mismo tenant;
- histórico de retirados preservado;
- sincronización `assigned_to` ↔ responsable activo.

### MOV-084 — migración

`20260810180000_add_work_order_participants_v1.sql`

Incluye:

- tabla `ot_participantes`;
- bootstrap de OTs históricas con `assigned_to`;
- helper privado de participación activa;
- trigger de sincronización responsable;
- RLS;
- SELECT directo para authenticated, sin DML directo.

### MOV-085 — pgTAP

`work_order_participants_v1.sql` — 21 pruebas.

Primer ciclo detectó un fixture histórico incoherente en `security_rls.sql`: tenant B tenía una OT asignada al administrador. Se corrigió el fixture creando un técnico real separado; no se relajó la invariante.

**Validación:** Quality 327 ✅ · Supabase Quality 23 ✅.

---

## OT-06B — Gestión de colaboradores

RPC:

`set_work_order_collaborator(work_order_uuid, technician_uuid, enabled, reason_text)`

Características:

- gestión manager-only validada en servidor;
- técnico activo del mismo tenant;
- responsable no se gestiona como colaborador;
- alta idempotente;
- retirada con motivo;
- histórico preservado;
- reingreso crea nueva participación;
- auditoría.

Test:

`work_order_collaborator_management_v1.sql` — 20 pruebas.

**Validación:** Quality 329 ✅ · Supabase Quality 25 ✅.

---

## OT-06C — Ejecución multi-participante y visitas simultáneas

Migración:

`20260810190000_enable_multi_participant_visits_v1.sql`

Cambios:

- `can_execute_work_order` reconoce participantes activos;
- `can_access_work_order` reconoce participantes activos;
- aceptar continúa siendo responsable-only;
- participante activo puede iniciar su propia visita;
- OT permite varias visitas activas de técnicos diferentes;
- máximo una visita activa por OT+técnico;
- bloquear/reanudar continúa siendo responsable-only;
- `ot_visitas` queda SELECT directo; DML solo por RPC;
- se retira EXECUTE autenticado de `finalize_work_order_visit(uuid,jsonb)` legacy;
- guard de actor de visita;
- guard que impide `FINALIZADA_TECNICO` con visitas activas.

Test:

`work_order_multi_visit_execution_v1.sql` — 27 pruebas.

Matriz ACL actualizada explícitamente.

**Validación:** Quality 336 ✅ · Supabase Quality 32 ✅.

---

## OT-06D — Cierre de visita separado de cierre de OT

Migración:

`20260810193000_separate_visit_and_work_order_completion_v1.sql`

### Nueva acción `close_my_work_order_visit`

Cada participante puede cerrar únicamente su visita activa y guardar:

- trabajo realizado;
- diagnóstico;
- pruebas;
- recomendaciones;
- pendientes;
- próxima acción;
- resultado de visita.

Cerrar una visita **no finaliza la OT**.

### Nueva acción `finalize_work_order_technical`

Solo responsable:

- OT en curso;
- ninguna visita activa;
- al menos una visita finalizada;
- validación de checklist/fotos/mediciones/materiales/prueba/firmas/informe;
- resumen técnico global;
- transición a `FINALIZADA_TECNICO`.

### Compatibilidad

`finalize_active_work_order_visit` se mantiene temporalmente como wrapper para el frontend histórico y conserva además su evento de auditoría legacy.

Test:

`work_order_separate_completion_v1.sql` — 28 pruebas.

Incluye corrección administrativa → `EN_CURSO` → nueva visita sin alterar visitas históricas.

Primer ciclo detectó dos expectativas de auditoría; se corrigió la lectura del test bajo rol administrador y se preservó el evento legacy del wrapper.

**Validación:** Quality 344 ✅ · Supabase Quality 40 ✅.

---

## OT-06E — Relevo de responsable

Migración:

`20260810200000_handover_work_order_responsibility_v1.sql`

RPC:

`handover_work_order_responsibility(...)`

Política V1:

- manager-only;
- nota obligatoria;
- entrante técnico activo del mismo tenant;
- no al mismo responsable;
- saliente debe cerrar su visita antes del relevo;
- entrante puede estar ya colaborando y mantener su visita activa;
- sincroniza `assigned_to` y responsable activo;
- saliente puede conservarse como colaborador;
- histórico y auditoría intactos.

Test:

`work_order_handover_v1.sql` — 25 pruebas.

Matriz ACL actualizada a 51 funciones públicas de aplicación tras incorporar la RPC de relevo.

**Validación:** Quality 350 ✅ · Supabase Quality 46 ✅.

---

## MOV-092 — Repository frontend

**COMPLETADO.**

Archivo:

`src/features/work-orders/api/workOrderTeamRepository.ts`

Encapsula:

- participantes;
- visitas;
- colaboradores;
- cerrar mi visita;
- finalizar OT;
- relevo;
- resolución de rol activo.

No se realizan mutaciones directas desde componentes.

Test:

`workOrderTeamRepository.test.ts`.

**Control intermedio:** Quality 352 ✅.

---

## MOV-093 / MOV-098 — Equipo técnico y relevo UI

`WorkOrderAssignmentPanel` amplía la ficha administrativa con:

- asignación principal legacy antes de aceptación;
- responsable visible;
- colaboradores activos;
- añadir/retirar colaborador;
- relevo de responsable;
- opción de mantener al saliente como colaborador.

Las mutaciones usan exclusivamente el repository/RPC OT-06.

---

## MOV-094 — Zona técnico multi-participante

`TechnicianMobileWorkspace` ya no descarta las OTs donde el usuario es colaborador.

La lista técnica confía en el alcance RLS del servidor para usuarios técnicos y distingue:

- `Responsable`;
- `Colaborador`.

Comportamiento:

- ASIGNADA: solo responsable acepta;
- ACEPTADA: participante puede iniciar su visita;
- EN_CURSO/BLOQUEADA: participante abre ejecución.

El helper `groupTechnicianOrders` conserva modo legacy por `assigned_to` para consumidores anteriores y añade un modo explícito de participantes.

Test:

`technicianMobileParticipants.test.ts`.

---

## MOV-095 / MOV-096 / MOV-097 — UI de visitas y cierre

`WorkOrderCompletionPanel` se divide conceptualmente en:

### Mi visita

- muestra rol del participante;
- permite iniciar mi visita cuando procede;
- permite cerrar únicamente mi visita;
- resultado de la visita independiente del estado final de OT.

### Finalizar OT

Solo responsable:

- comprueba que no queden visitas activas;
- muestra requisitos globales;
- solicita resumen técnico global y confirmación;
- ejecuta `finalize_work_order_technical`.

`WorkOrderVisitSummaryPanel` muestra todas las visitas con técnico, inicio, fin, estado y trabajo realizado.

---

## App.tsx — cambio mínimo

La guarda de lifecycle cambia únicamente para permitir `start` a un técnico participante. Aceptar, bloquear y reanudar continúan reservados al responsable y además siguen protegidos en PostgreSQL.

No se ha trasladado lógica de seguridad al frontend.

---

## Incidencia Quality 363 — aislamiento navegación

Quality 363 tuvo un único fallo en `App.navigation.test.ts`:

- la navegación real de `App.tsx` seguía correcta;
- el test importaba todo `App.tsx` solo para comprobar arrays de navegación y recibió un valor contaminado durante Vitest.

Corrección arquitectónica:

- nueva configuración pura `src/navigation/appNavigation.ts`;
- `App.tsx` consume ese mismo módulo;
- `App.navigation.test.ts` prueba ese módulo puro;
- no se cambia ningún ID, label ni módulo visible.

Los módulos secundarios siguen siendo:

- Técnicos;
- Clientes / instalaciones;
- Informes;
- Auditoría;
- Configuración.

---

## Validación SQL actual

En el HEAD anterior al ajuste de navegación, Supabase Quality 59 ya quedó completamente verde:

- start ✅
- db reset ✅
- db lint ✅
- todo pgTAP ✅
- stop ✅

El HEAD definitivo deberá volver a pasar ambos pipelines después de este documento y la extracción de navegación.

---

## MOV-099 / MOV-100 / MOV-101 — estado

- Tests frontend OT-06: implementados; pendiente último Quality sobre HEAD definitivo.
- Supabase Quality: backend completo ya validado; pendiente reconfirmación sobre HEAD definitivo.
- Quality: pendiente reconfirmación tras aislar navegación.

---

## MOV-102 — siguiente movimiento

Tras ambos pipelines verdes sobre el mismo HEAD:

1. comparar rama completa contra `main`;
2. revisar archivos exactos;
3. confirmar ausencia de workflows temporales;
4. revisar RLS/ACL/RPC;
5. actualizar descripción PR #49;
6. dejar control final escrito.

## MOV-103

Marcar PR #49 **Ready for review** únicamente si Quality y Supabase Quality están verdes sobre el mismo HEAD definitivo.

## MOV-104

**Squash & Merge requiere autorización explícita.**

No se realizará automáticamente.

## MOV-105

Después de un eventual merge aprobado, OT-07 se creará exclusivamente desde el nuevo `main`.

Orientación inicial OT-07: bloqueos operativos, motivos estructurados y SLA.

---

## Seguridad / despliegue

Durante OT-06:

- producción: sin cambios;
- mini PC: sin cambios;
- Cloudflare: sin cambios;
- IsiVoltPro Platform/PocketBase: sin cambios;
- datos reales: sin cambios;
- no se ha desplegado ninguna migración fuera de GitHub Actions local Supabase.
