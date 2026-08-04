# Estado actual de IsiVoltPro OT

Fecha de revisión: 4 de agosto de 2026.

## Resumen ejecutivo

IsiVoltPro OT es un MVP avanzado con el ciclo principal de órdenes de trabajo y su cierre documental implementados. La arquitectura definitiva utiliza **un único código y una única aplicación** con dos identidades configurables:

- **IsiVoltPro OT**: producto principal para uso real.
- **HomeServe OT Demo**: demostración del mismo producto con datos ficticios.

Las funciones no se duplican. Cada mejora de órdenes, técnicos, checklist, fotos, firmas o informes se incorpora a ambas identidades automáticamente.

## Arquitectura de producto

### Una aplicación, dos identidades

- Configuración centralizada en `src/config/productBrand.ts`.
- Detección inicial por hostname, ruta, query de previsualización o variable de compilación.
- La organización autenticada confirma la identidad mediante `tenants.branding_key`.
- `ot.isivoltpro.es` muestra IsiVoltPro OT.
- `demo-homeserve.isivoltpro.es` muestra HomeServe OT Demo.
- Nombre, wordmark vectorial, distintivo, textos, colores, título, descripción y manifiesto PWA cambian en tiempo de ejecución.
- La pantalla de carga utiliza la identidad activa y ya no contiene referencias fijas a HomeServe.
- No se usan logotipos gráficos de terceros dentro del repositorio.
- HomeServe se mantiene exclusivamente como identidad demostrativa.

### Separación de datos

- Autenticación mediante Supabase Auth.
- Organizaciones y membresías aisladas con `tenant_id` y Row Level Security.
- La tabla `tenants` incorpora `branding_key` con los valores `isivoltpro` y `homeserve-demo`.
- La organización `HomeServe Demo Madrid` está marcada como `homeserve-demo`.
- La organización real `IsiVoltPro` está activa con `branding_key = 'isivoltpro'`.
- El administrador activo de la demo tiene también acceso administrativo a IsiVoltPro.
- La organización IsiVoltPro comienza vacía: no se han copiado clientes, instalaciones ni órdenes de la demo.
- Los usuarios anónimos no pueden leer organizaciones ni su marca.
- Los usuarios autenticados solo pueden consultar organizaciones a las que pertenecen.

## Capacidades implementadas

### Gestión administrativa

- Clientes, instalaciones, ubicaciones y activos.
- Técnicos, invitaciones y roles.
- Creación, asignación y reasignación de OT.
- Planificación, prioridades, fechas límite y dashboard.
- Auditoría de acciones y cambios de estado.

### Ejecución técnica

- Vista móvil específica para técnicos.
- Aceptación, inicio, bloqueo y reanudación.
- Checklist versionado y respuestas avanzadas.
- Fotografías iniciales, finales y vinculadas a puntos.
- Resumen, diagnóstico, pruebas, recomendaciones y trabajo pendiente.
- Firma táctil con dedo, lápiz o ratón.
- Firma PNG privada vinculada a organización, OT, visita y técnico.
- Finalización protegida y envío a revisión administrativa.

### Informes PDF

- Informe provisional después del cierre técnico.
- Informe final después de la validación administrativa.
- Generación automática cuando la OT exige informe.
- Generación manual cuando el informe es opcional.
- Histórico de versiones sin sobrescritura.
- Un único informe final listo e inmutable por OT.
- Inclusión de datos, checklist, observaciones, fotos, firma y validación.
- Cabecera, colores, metadatos y pie derivados de `tenants.branding_key`.
- HomeServe OT Demo genera documentos demostrativos con identidad propia.
- IsiVoltPro OT genera documentos privados con identidad IsiVoltPro.
- La marca nunca se acepta desde el cuerpo enviado por el navegador.
- Almacenamiento privado en `ot-reports`.
- Descarga mediante URL firmada temporal.
- Registro de tamaño, MIME, huella SHA-256 y estado.
- Edge Function `generate-work-order-report` versión 2 activa, protegida con JWT y operaciones privilegiadas mediante `service_role`.

## Despliegue preparado para el mini PC

- `Dockerfile` multietapa con Node 22 y Nginx Alpine.
- `docker-compose.yml` con reinicio automático y healthcheck.
- Servicio publicado únicamente en `127.0.0.1:8088`.
- Configuración Nginx para SPA, caché de assets y cabeceras básicas de seguridad.
- Un mismo contenedor puede responder a los dos dominios.
- Cloudflare Tunnel actúa como única entrada pública.
- No es necesario abrir puertos en el router.
- Guion completo disponible en `docs/DEPLOY_MINI_PC.md`.
- GitHub Pages conserva `/isivoltpro-ot/`; el contenedor utiliza la raíz `/`.

## Calidad verificada

Última validación confirmada:

- TypeScript correcto.
- ESLint correcto.
- **40 archivos de prueba**.
- **193 pruebas superadas**.
- Pruebas de contrato para marca de organización y PDF.
- Build de producción correcto.
- Imagen Docker de producción construida correctamente en GitHub Actions.
- Edge Function versión 2 compilada y activa en Supabase.
- Dependencias principales separadas en chunks para reducir el paquete inicial.

## Parcialmente implementado

- Activos e histórico existen, pero falta una ficha completa con QR/NFC.
- Planes preventivos existen en base de datos, pero falta una experiencia operativa completa.
- PWA dispone de manifiestos, pero faltan service worker, offline y prueba de instalación Android.
- Realtime está previsto, pero el flujo actual usa principalmente invalidaciones y refrescos.
- Firma del responsable todavía no tiene captura diferenciada en la interfaz.

## Bloqueos para el piloto

1. Instalar el contenedor en el mini PC con las variables reales de Supabase.
2. Configurar en Cloudflare `ot.isivoltpro.es` y `demo-homeserve.isivoltpro.es` hacia `localhost:8088`.
3. Ejecutar el escenario coordinador → técnico → firma → cierre → provisional → revisión → validación → final.
4. Revisar visualmente un PDF de cada identidad con fotografías reales.
5. Probar firma, instalación PWA y apertura del PDF en Android.
6. Crear el repositorio definitivo `isivoltpro-ot`, conservando `homeserve` como respaldo temporal.

## Orden posterior

1. Desplegar y validar en el mini PC.
2. Enlazar IsiVoltPro OT desde la web principal de IsiVoltPro.
3. Ejecutar el piloto completo en ambas identidades.
4. PWA y experiencia Android.
5. QR/NFC e histórico completo de activos.
6. Mantenimiento preventivo recurrente.

## Regla de alcance

HomeServe OT Demo debe mantenerse funcionalmente igual que IsiVoltPro OT, cambiando identidad y datos de demostración. No se desarrollarán dos aplicaciones separadas ni dos ramas funcionales divergentes.
