# Estado actual de IsiVoltPro OT

Fecha de revisión: 4 de agosto de 2026.

## Resumen ejecutivo

IsiVoltPro OT es actualmente un MVP avanzado. El núcleo de órdenes de trabajo, la seguridad multiempresa y la ejecución técnica ya están desarrollados. La siguiente meta no es ampliar el ecosistema, sino cerrar el ciclo documental, validar la nueva identidad y preparar una primera versión piloto fiable.

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
- Envío a revisión administrativa.

### Revisión

- Lectura central de evidencias.
- Solicitud de correcciones.
- Validación administrativa.
- Estados oficiales e inmutabilidad en base de datos.

## Parcialmente implementado

- Activos e histórico: existen datos y vistas iniciales, pero no una ficha completa de activo con QR/NFC.
- Planes preventivos: existen tablas y funciones, pero falta una experiencia operativa completa.
- Informes: existen tablas y requisitos, pero no la generación y descarga final en la interfaz.
- Firmas: existe soporte en base de datos, pero falta captura táctil y almacenamiento desde la aplicación.
- PWA: existe manifest, pero faltan service worker, estrategia offline y pruebas de instalación reales.
- Realtime: está previsto arquitectónicamente, pero el flujo actual depende principalmente de invalidaciones y refrescos.

## Bloqueos para una versión piloto

1. Validar la rama de identidad IsiVoltPro OT con CI completo.
2. Eliminar referencias visuales restantes a HomeServe y FV que no correspondan al producto general.
3. Implementar firma técnica.
4. Generar PDF provisional y final versionado.
5. Añadir descarga privada mediante URL firmada.
6. Ejecutar el escenario completo coordinador → técnico → revisión → validación.
7. Revisar RLS, Storage y migraciones en un entorno de staging limpio.
8. Separar el repositorio definitivo `isivoltpro-ot` del respaldo `homeserve`.

## Próximo sprint: cierre documental de la OT

### Objetivo

Completar una OT sin pasos simulados ni requisitos imposibles de registrar.

### Entregables

- Componente de firma táctil para técnico.
- Subida privada a `ot-signatures`.
- Registro seguro en `ot_firmas`.
- Generador de informe provisional al finalizar.
- Generador de informe final al validar.
- Versionado en `ot_informes` sin sobrescritura.
- Descarga por URL firmada.
- Auditoría de firma y generación documental.
- Pruebas unitarias, SQL y de flujo.

### Criterio de salida

Una OT que requiera firma e informe puede recorrer el ciclo completo y quedar validada con un PDF final privado, versionado e inmutable.

## Orden posterior

1. Rutas reales con React Router.
2. Despliegue automático y rollback en el mini PC.
3. PWA estable y pruebas Android.
4. Realtime y notificaciones internas.
5. QR/NFC e histórico completo de activos.
6. Mantenimiento preventivo recurrente.

## Regla de alcance

No incorporar inventario completo, PCI, Legionella, RITE o inspecciones dentro de IsiVoltPro OT antes de cerrar el ciclo documental y validar la versión piloto. Esos dominios deben evolucionar como aplicaciones o módulos independientes del ecosistema IsiVoltPro.
