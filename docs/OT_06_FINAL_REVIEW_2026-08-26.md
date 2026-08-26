# IsiVoltPro OT — OT-06 · revisión final de cierre

Fecha: 2026-08-26
Rama: `feat/ot-multi-technician-visits-v1`
PR: #49
Base: `main` @ `4605843d4b605cf4fa14b7e133ec79740fe1e140`

## Objetivo de este control

Cerrar OT-06 sobre el comportamiento realmente implementado, no sobre la descripción inicial OT-06A del PR.

OT-06 incluye ya:

- participante responsable compatible con `ordenes_trabajo.assigned_to`;
- colaboradores activos y retirados con histórico;
- ejecución por participante activo;
- múltiples visitas por OT y técnico;
- máximo una visita activa por OT+técnico;
- cierre individual de visita;
- cierre técnico global separado;
- relevo de responsable con trazabilidad;
- apertura de nuevas visitas después de corrección administrativa;
- repositories y UI de equipo/visitas/relevo;
- tests frontend y pgTAP específicos.

## Revisión de seguridad

Principios que se mantienen:

1. RLS/RPC son la autoridad real; React no concede permisos.
2. `authenticated` no obtiene DML directo sobre `ot_participantes` ni `ot_visitas` para saltarse el flujo.
3. Las RPC verifican actor, tenant, rol y estado de la OT.
4. `assigned_to` continúa siendo el responsable principal por compatibilidad.
5. Los colaboradores pueden ejecutar su propia visita, pero no finalizar globalmente la OT.
6. El cierre técnico global exige al responsable actual.
7. No se permite el cierre global con visitas activas.
8. Los requisitos de checklist, fotos, mediciones, materiales, prueba funcional, firmas e informe se vuelven a comprobar en PostgreSQL.
9. Las acciones relevantes generan auditoría.
10. No se despliega ninguna migración a producción durante esta fase.

## Hallazgo de revisión final: visitas pendientes

Se detectó un hueco de ciclo de vida aun con los pipelines verdes:

- un técnico podía cerrar su visita con `pendiente_material`, `pendiente_cliente` o `necesita_otra_visita`;
- si ya no quedaban visitas `EN_CURSO`, el responsable podía finalizar técnicamente la OT;
- por tanto la OT podía entrar en `FINALIZADA_TECNICO` aunque la última intervención de un miembro del equipo declarase trabajo pendiente.

### Corrección

Migración añadida:

`supabase/migrations/20260826114500_require_resolved_latest_visits_v1.sql`

Regla nueva:

> La OT solo puede finalizarse globalmente cuando la última visita finalizada de cada técnico implicado tenga `resultado_cierre = trabajo_completado`.

La comprobación se hace sobre la última visita de cada técnico, no sobre todo el histórico. Esto permite:

1. visita A → `necesita_otra_visita`;
2. visita B posterior del mismo técnico → `trabajo_completado`;
3. el histórico A se conserva;
4. B resuelve el pendiente;
5. el cierre global vuelve a estar permitido si el resto de requisitos también se cumple.

## Contrato pgTAP actualizado

`supabase/tests/work_order_separate_completion_v1.sql` valida ahora explícitamente:

- responsable y colaborador pueden tener visitas simultáneas;
- cada técnico cierra únicamente su intervención;
- un cierre `necesita_otra_visita` no finaliza la OT;
- aunque no queden visitas activas, el cierre global falla mientras ese pendiente sea la última visita del técnico;
- el técnico puede abrir una visita posterior;
- la nueva visita resuelta conserva ambas visitas históricas;
- el responsable puede finalizar únicamente después de quedar resueltas las últimas visitas.

## Estado de validación

HEAD anterior `ca07ccfba0694760e2972934c514d2a20cd514e6`:

- Quality: verde.
- Supabase Quality: verde.

Tras el hardening de visitas pendientes se han lanzado de nuevo ambos pipelines. Este documento no debe declarar el HEAD definitivo Ready hasta que Quality y Supabase Quality estén verdes sobre el mismo commit final.

## Antes de Ready for review

- [ ] Quality verde sobre HEAD definitivo.
- [ ] Supabase Quality verde sobre HEAD definitivo.
- [ ] Revisar diff completo contra `main`.
- [ ] Confirmar que no existen workflows temporales en el diff.
- [ ] Actualizar la descripción del PR #49 para eliminar el texto antiguo de “solo 4 archivos / sin frontend”.
- [ ] Mantener el PR como Draft hasta completar los puntos anteriores.

## Merge y siguiente fase

No realizar merge automáticamente.

**Squash & Merge requiere autorización explícita.**

Después de un merge autorizado, OT-07 debe nacer exclusivamente del nuevo `main` y abordar bloqueos operativos, motivos estructurados y SLA sin mezclar código histórico de ramas anteriores.
