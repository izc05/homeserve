# Estado actual de IsiVoltPro OT

Fecha de revisión: 4 de agosto de 2026.

## Resumen ejecutivo

IsiVoltPro OT es un MVP avanzado con el ciclo documental principal ya implementado. El núcleo de órdenes de trabajo, la seguridad multiempresa, la ejecución técnica, la firma táctil y los informes PDF versionados están desarrollados. La prioridad actual es validar el recorrido completo con usuarios reales de demostración, comprobar la experiencia móvil y preparar una primera versión piloto fiable.

## Capacidades implementadas

### Plataforma y acceso

- Autenticación con Supabase Auth.
- Organizaciones y membresías.
- Roles de administrador, coordinador, técnico, técnico externo y solo lectura.
- Invitaciones de usuario.
- Aislamiento por organización mediante Row Level Security.

### Gestión administrativa

- Clientes, instalaciones, ubicaciones y activos.
- Alta rápida desde la creación de una OT.
- Técnicos e invitaciones.
- Creación, asignación y reasignación de OT.
- Planificación, prioridades y fechas límite.
- Dashboard administrativo.
- Auditoría de acciones y cambios de estado.

### Ejecución técnica

- Vista móvil específica para el técnico.
- Aceptación e inicio de la OT.
- Bloqueo y reanudación con motivo.
- Checklist preparado y versionado.
- Respuestas avanzadas y fotos vinculadas a puntos.
- Fotografías iniciales, finales y de evidencia.
- Resumen del trabajo y finalización protegida.
- Firma táctil con dedo, lápiz o ratón.
- Firma PNG privada vinculada a organización, OT, visita y técnico.
- Envío a revisión administrativa.

### Cierre documental

- Informe PDF provisional después del cierre técnico.
- Informe PDF final después de la validación administrativa.
- Generación automática del primer provisional y del final cuando la OT exige informe.
- Los informes opcionales continúan disponibles mediante generación manual.
- Protección contra dobles generaciones automáticas al volver a abrir una OT.
- Histórico de versiones sin sobrescritura.
- Un único informe final listo e inmutable por OT.
- Datos de cliente, instalación, activo, intervención y técnico.
- Checklist, observaciones, fotografías y firma incorporados al PDF.
- Validación administrativa incorporada al informe final.
- Almacenamiento privado en `ot-reports`.
- Descarga mediante URL firmada de cinco minutos.
- Huella SHA-256, tamaño, MIME y estado de generación registrados.
- Auditoría de reserva, finalización y fallo documental.
- Edge Function `generate-work-order-report` desplegada con JWT obligatorio.

### Revisión

- Lectura central de evidencias.
- Consulta del histórico de informes.
- Solicitud de correcciones.
- Validación administrativa.
- Estados oficiales e inmutabilidad en base de datos.

### Calidad y seguridad

- CI con Node 22.
- Instalación reproducible mediante `npm ci`.
- Typecheck, ESLint, Vitest y build en cada pull request.
- Último control: 38 archivos de prueba y 187 pruebas correctas.
- Migraciones de firma e informes aplicadas en `isivoltpro-demo-madrid`.
- El navegador no puede escribir directamente en `ot_informes` ni `ot_firmas`.
- El navegador tampoco puede subir, modificar o borrar objetos de `ot-reports`.
- Solo el servicio de documentos puede completar o marcar fallida una versión.
- El técnico asignado puede reservar un provisional únicamente con la OT finalizada técnicamente.
- Solo un responsable puede reservar el informe final de una OT validada.

## Parcialmente implementado

- Activos e histórico: existen datos y vistas iniciales, pero no una ficha completa de activo con QR/NFC.
- Planes preventivos: existen tablas y funciones, pero falta una experiencia operativa completa.
- PWA: existe manifest, pero faltan service worker, estrategia offline y pruebas de instalación reales.
- Realtime: está previsto arquitectónicamente, pero el flujo actual depende principalmente de invalidaciones y refrescos.
- Firma del responsable: el modelo de datos la contempla, pero no existe todavía una captura diferenciada en la interfaz.

## Validaciones realizadas

- TypeScript, lint, 38 archivos de prueba, 187 pruebas y build de producción correctos en GitHub Actions.
- Migración de firma segura aplicada.
- Migración de informes versionados aplicada.
- Migración de endurecimiento de Storage aplicada.
- Migración de capacidades para generación automática aplicada.
- Edge Function activa y compilada por Supabase.
- Permisos comprobados: `authenticated` reserva; `service_role` completa o falla; `anon` no ejecuta.
- La OT demo `OT-2026-00003`, en `FINALIZADA_TECNICO`, no exige informe y no dispara automatismos.
- La OT demo `OT-2026-00004` exige informe y queda preparada para validar el automatismo al completar su ejecución.

## Bloqueos para una versión piloto

1. Ejecutar desde la interfaz el escenario autenticado completo coordinador → técnico → firma → cierre → PDF provisional → revisión → validación → PDF final.
2. Probar la firma táctil y la apertura del PDF en un dispositivo Android real.
3. Revisar visualmente un PDF generado con fotografías reales y ajustar composición si fuera necesario.
4. Crear el repositorio definitivo `isivoltpro-ot` conservando `homeserve` como respaldo temporal.
5. Configurar y validar el despliegue público definitivo con sus variables y secretos.

## Próximo sprint: validación piloto

### Objetivo

Demostrar que una OT real de prueba recorre todo el flujo sin intervención manual en base de datos y termina con un PDF final privado, versionado e inmutable.

### Entregables

- Guion E2E de coordinador y técnico.
- OT de prueba controlada con checklist, fotos y firma.
- Informe provisional revisado visualmente.
- Validación administrativa y generación final automática.
- Prueba de descarga temporal y caducidad del enlace.
- Prueba móvil Android.
- Registro de incidencias y correcciones del piloto.

### Criterio de salida

Una OT que requiera firma e informe puede recorrer el ciclo completo desde la interfaz y quedar validada con un PDF final privado, descargable temporalmente, versionado e inmutable.

## Orden posterior

1. Rutas reales con React Router.
2. Despliegue automático y rollback en el mini PC.
3. PWA estable y pruebas Android.
4. Realtime y notificaciones internas.
5. QR/NFC e histórico completo de activos.
6. Mantenimiento preventivo recurrente.

## Regla de alcance

No incorporar inventario completo, PCI, Legionella, RITE o inspecciones dentro de IsiVoltPro OT antes de validar la versión piloto. Esos dominios deben evolucionar como aplicaciones o módulos independientes del ecosistema IsiVoltPro.
