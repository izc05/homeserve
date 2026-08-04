# Estado actual de IsiVoltPro OT

Fecha de revisión: 4 de agosto de 2026.

## Resumen ejecutivo

IsiVoltPro OT es un MVP avanzado y multisector con el ciclo principal de órdenes de trabajo y su cierre documental implementados. Ya no está orientado únicamente a energía fotovoltaica: permite organizar cualquier instalación por sistemas técnicos, activos, especialidades, técnicos y órdenes de trabajo.

La arquitectura utiliza **un único código y una única aplicación** con dos identidades configurables:

- **IsiVoltPro OT**: producto principal para uso real.
- **HomeServe OT Demo**: demostración del mismo producto con datos ficticios.

Las funciones no se duplican. Cada mejora de órdenes, técnicos, checklist, fotos, firmas, informes o sistemas técnicos se incorpora a ambas identidades automáticamente.

## Arquitectura de producto

### Una aplicación, dos identidades

- Configuración centralizada en `src/config/productBrand.ts`.
- Detección inicial por hostname, ruta, query de previsualización o variable de compilación.
- La organización autenticada confirma la identidad mediante `tenants.branding_key`.
- `ot.isivoltpro.es` muestra IsiVoltPro OT.
- `demo-homeserve.isivoltpro.es` muestra HomeServe OT Demo.
- Nombre, wordmark vectorial, distintivo, textos, colores, título, descripción y manifiesto PWA cambian en tiempo de ejecución.
- La pantalla de carga utiliza la identidad activa y no contiene referencias fijas a HomeServe.
- HomeServe se mantiene exclusivamente como identidad demostrativa.

### Separación de datos

- Autenticación mediante Supabase Auth.
- Organizaciones y membresías aisladas con `tenant_id` y Row Level Security.
- La organización `HomeServe Demo Madrid` está marcada como `homeserve-demo`.
- La organización real `IsiVoltPro` está activa con `branding_key = 'isivoltpro'`.
- El administrador activo de la demo tiene también acceso administrativo a IsiVoltPro.
- IsiVoltPro comienza vacía: no se copiaron clientes, instalaciones ni órdenes de la demo.
- Los usuarios anónimos no pueden leer organizaciones ni ejecutar la creación multisector de OT.
- Los usuarios autenticados solo pueden consultar organizaciones a las que pertenecen.

## Modelo multisector

### Jerarquía

```text
Organización
└── Cliente
    └── Instalación o centro
        ├── Ubicaciones
        └── Sistemas técnicos
            ├── Activos y equipos
            ├── Checklist
            └── Órdenes de trabajo
```

Una instalación puede contener varios sistemas simultáneamente. Un hospital, por ejemplo, puede organizar baja tensión, climatización, PCI, fontanería, ACS, gases medicinales, telecomunicaciones, ascensores y automatización sin crear instalaciones artificiales separadas.

### Catálogo técnico

Se ha incorporado un catálogo inicial de **21 especialidades**:

- General o multidisciplinar.
- Electricidad BT y MT/AT.
- Fotovoltaica, grupos electrógenos y SAI.
- Climatización, ventilación y refrigeración.
- Fontanería, saneamiento, ACS y Legionella.
- PCI.
- Gases medicinales y electromedicina.
- Ascensores.
- Telecomunicaciones, seguridad y control de accesos.
- Automatización y control.
- Aire comprimido, vapor y fluidos térmicos.
- Obra civil y eficiencia energética.
- Otra especialidad.

Fotovoltaica se conserva como una especialidad más y no como valor predeterminado del producto.

### Instalaciones, sistemas y activos

- Las instalaciones admiten sector, uso principal y nivel de riesgo.
- Cada instalación puede disponer de varios sistemas técnicos.
- Los sistemas registran especialidad, código, criticidad, estado y normativa aplicable.
- Los sistemas utilizan baja lógica y no pueden borrarse físicamente cuando conservan activos u OT históricas.
- Los activos pueden vincularse a un sistema y almacenar datos técnicos flexibles, además de marca, modelo, serie, referencia, criticidad y normativa.
- Las instalaciones existentes recibieron un `Sistema general` sin alterar documentos históricos.

### OT multisector

- El formulario permite elegir especialidad y sistema técnico.
- Los activos se filtran por instalación, sistema y ubicación.
- Al seleccionar un activo clasificado, la OT hereda automáticamente su sistema.
- La base de datos rechaza combinaciones donde activo y sistema no coinciden.
- La especialidad se deriva del sistema cuando existe uno seleccionado.
- La nueva creación utiliza `create_work_order_v2`.
- La RPC requiere usuario autenticado, no es `security definer` y permanece protegida por permisos y RLS.
- Las OT antiguas se conservan como `general`; no se modificaron automáticamente las OT validadas o canceladas, que siguen siendo inmutables.

### Técnicos y checklist

- Un técnico puede tener varias especialidades y una especialidad principal.
- Cada especialidad puede registrar nivel de apoyo, competente, especialista o responsable.
- El formulario marca a los técnicos cuya especialidad coincide, sin bloquear asignaciones de apoyo o empresas externas.
- Las plantillas de checklist pueden clasificarse por especialidad.

## Capacidades implementadas

### Gestión administrativa

- Clientes, instalaciones, ubicaciones, sistemas técnicos y activos.
- Técnicos, invitaciones, roles y especialidades múltiples.
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
- Almacenamiento privado en `ot-reports` y descarga mediante URL firmada temporal.
- Registro de tamaño, MIME, huella SHA-256 y estado.
- Edge Function `generate-work-order-report` versión 2 activa y protegida con JWT.

## Despliegue preparado para el mini PC

- `Dockerfile` multietapa con Node 22 y Nginx Alpine.
- `docker-compose.yml` con reinicio automático y healthcheck.
- Servicio publicado únicamente en `127.0.0.1:8088`.
- Configuración Nginx para SPA, caché y cabeceras básicas de seguridad.
- Un mismo contenedor puede responder a los dos dominios.
- Cloudflare Tunnel actúa como única entrada pública.
- Script con instalación, actualización, rollback, estado, logs y parada.
- No es necesario abrir puertos en el router.

## Calidad verificada

Última validación confirmada:

- TypeScript correcto.
- ESLint correcto.
- **41 archivos de prueba**.
- **196 pruebas superadas**.
- Pruebas de contrato para marca, PDF y catálogo multisector.
- Build de producción correcto.
- Validación del despliegue del mini PC correcta.
- Imagen Docker de producción construida correctamente.
- Migraciones multisector aplicadas en Supabase.
- Edge Function de informes versión 2 activa.

## Parcialmente implementado

- La selección de especialidad y sistema ya está en el alta de OT, pero falta un espacio administrativo completo para crear, editar y dar de baja sistemas técnicos desde la ficha de instalación.
- Los activos admiten sistema y datos técnicos, pero falta la ficha completa con QR/NFC.
- Las especialidades múltiples existen en base de datos y catálogo, pero falta su editor visual completo dentro de la ficha del técnico.
- Los checklist admiten clasificación por especialidad, pero falta la biblioteca inicial de plantillas por disciplina.
- Planes preventivos existen en base de datos, pero falta una experiencia operativa multisector completa.
- PWA dispone de manifiestos, pero faltan service worker, offline y prueba de instalación Android.
- Firma del responsable todavía no tiene captura diferenciada en la interfaz.

## Bloqueos para el piloto

1. Instalar el contenedor en el mini PC con las variables reales de Supabase.
2. Configurar `ot.isivoltpro.es` y `demo-homeserve.isivoltpro.es` mediante Cloudflare Tunnel.
3. Ejecutar el escenario coordinador → técnico → firma → cierre → provisional → revisión → validación → final.
4. Probar una OT de electricidad, una de climatización y otra de PCI o fontanería.
5. Revisar visualmente un PDF de cada identidad con fotografías reales.
6. Probar firma, instalación PWA y apertura del PDF en Android.
7. Crear el repositorio definitivo `isivoltpro-ot`, conservando `homeserve` como respaldo temporal.

## Orden posterior

1. Crear el espacio administrativo de sistemas técnicos dentro de cada instalación.
2. Añadir editor de especialidades por técnico.
3. Incorporar filtros y estadísticas por especialidad y sistema.
4. Crear bibliotecas de checklist por electricidad, climatización, PCI, fontanería, gases y otras disciplinas.
5. Desplegar y validar en el mini PC.
6. PWA, QR/NFC, histórico completo de activos y mantenimiento preventivo recurrente.

## Regla de alcance

HomeServe OT Demo debe mantenerse funcionalmente igual que IsiVoltPro OT, cambiando identidad y datos de demostración. No se desarrollarán dos aplicaciones separadas ni ramas funcionales divergentes.
