# Roadmap

## Fase 0 — Fundación documental

- README.
- instrucciones para agentes.
- especificación funcional.
- arquitectura.
- modelo de datos.
- seguridad.
- flujos UI.
- criterios de aceptación.

**Salida:** todos los agentes comparten las mismas decisiones.

## Fase 1 — Esqueleto y calidad

- React + TypeScript + Vite.
- estructura por dominios.
- estilos base responsive.
- ESLint, Prettier y Vitest.
- GitHub Actions.
- `.env.example`.
- páginas de acceso y estados básicos.

**Salida:** `npm install`, `npm run build`, `npm run test` funcionan.

## Fase 2 — Supabase y autenticación

- proyecto Supabase de desarrollo.
- cliente único.
- perfiles.
- organizaciones.
- miembros y roles.
- login, recuperación y cierre de sesión.
- selector de organización si procede.
- guardas de interfaz.

**Salida:** administrador, coordinador y técnico pueden iniciar sesión y ven su interfaz.

## Fase 3 — Seguridad y RLS

- migración inicial.
- políticas por organización.
- aislamiento técnico.
- funciones de rol.
- auditoría base.
- pruebas SQL de accesos permitidos y denegados.

**Salida:** cero acceso cruzado en pruebas directas.

## Fase 4 — Datos auxiliares mínimos

- centros.
- ubicaciones.
- activos opcionales.
- técnicos activos.
- plantillas de checklist.

**Salida:** el coordinador dispone de datos para crear una OT sin módulos complejos.

## Fase 5 — Creación y asignación de OT

- listado y filtros.
- formulario por pasos.
- código automático.
- borrador.
- requisitos.
- preparación de checklist.
- asignación.
- envío.
- detalle administrativo.

**Salida:** una OT puede crearse, prepararse y enviarse a un técnico.

## Fase 6 — Zona técnico

- Mis trabajos.
- aceptar.
- iniciar.
- detalle móvil.
- siguiente acción visible.
- historial propio.
- bloqueo y reanudación.

**Salida:** técnico ejecuta solo sus OT desde móvil.

## Fase 7 — Evidencias

- checklist.
- fotos.
- mediciones.
- observaciones.
- materiales.
- validaciones de requisitos.
- guardado fiable y mensajes claros.

**Salida:** la ejecución queda completamente documentada.

## Fase 8 — Firmas y finalización

- firma de técnico.
- firma de responsable opcional.
- comprobación de cierre.
- envío para revisión.
- bloqueo de edición técnica tras envío.

**Salida:** OT en `FINALIZADA_TECNICO` lista para revisar.

## Fase 9 — Revisión central

- resumen de evidencias.
- comprobaciones automáticas.
- solicitud de correcciones.
- devolución a `EN_CURSO`.
- validación.
- inmutabilidad.

**Salida:** ciclo completo responsable-técnico-responsable.

## Fase 10 — PDF

- plantilla corporativa configurable.
- informe provisional.
- informe final.
- versionado.
- almacenamiento privado.
- histórico y descarga.
- pruebas con informes largos y muchas fotos.

**Salida:** PDF profesional sin cortes ni pérdida de calidad.

## Fase 11 — Panel central y Realtime

- métricas.
- tablero por estado.
- técnicos en trabajo.
- OT vencidas y urgentes.
- agenda.
- Realtime.
- notificaciones internas.
- refresco de respaldo.

**Salida:** seguimiento operativo desde un único panel.

## Fase 12 — PWA y conectividad

- manifest.
- service worker.
- instalación.
- caché segura de interfaz.
- borradores locales temporales.
- recuperación al volver la conexión.
- pruebas Android reales.

**Salida:** PWA estable en móvil.

## Fase 13 — Producción

- staging.
- datos demo ficticios.
- pruebas de carga razonables.
- revisión RLS.
- backups.
- política de retención.
- monitorización de errores.
- despliegue Vercel.
- manual de puesta en servicio.

**Salida:** primera versión productiva.

## Fase 14 — APK opcional

Solo después de la aceptación de la PWA:

- Capacitor.
- cámara y archivos.
- safe areas.
- icono y splash.
- firma Android.
- APK interna.
- AAB si se publica.

## Priorización

### P0

Autenticación, RLS, creación, asignación, zona técnico, checklist, revisión y PDF.

### P1

Realtime, agenda, presencia, plantillas, notificaciones internas y PWA.

### P2

Push, correo, escaneo QR, cola offline completa, analítica avanzada y APK.

## Regla de avance

No iniciar una fase posterior si la anterior tiene fallos de permisos, pérdida de datos o flujo incompleto.
