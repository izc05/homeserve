# IsiVoltPro OT — renovación de identidad y acceso

## Alcance

La renovación parte de `main` y modifica únicamente identidad, presentación, PWA, metadatos, pantalla de acceso y validaciones de interfaz. No cambia el esquema de Supabase, las migraciones aplicadas, las políticas RLS, usuarios, clientes, instalaciones, técnicos, órdenes, puertos ni Cloudflare Tunnel.

## Identidad

- Producto: **IsiVoltPro OT**.
- Descriptor: **Gestión profesional de órdenes de trabajo**.
- Autoría: **Desarrollado por IsiVoltPro**.
- Paleta: azul marino oscuro `#071a33`, blanco y rojo IsiVoltPro `#ef2636` como acento.
- El logo se basa en el wordmark y favicon del repositorio principal de IsiVoltPro.
- Se elimina el activo de marca de terceros y no se carga ningún recurso externo durante el acceso.

## Pantalla de acceso

### Escritorio

- Contenedor máximo de 1.360 px.
- Panel de formulario: 47 %.
- Panel visual: 53 %.
- Altura mínima de 720 px.
- Campos de 54 px y acción principal de 50 px.

### Tablet y móvil

- A 900 px el panel visual se convierte en cabecera de 260 px.
- A 640 px la cabecera se reduce a 220 px y el formulario conserva el ancho completo.
- No existe desplazamiento horizontal.
- Los campos y botones conservan tamaños táctiles adecuados.

## Ecosistema dinámico

Se incluyen seis escenas:

1. Órdenes de trabajo.
2. Herramientas QR y NFC.
3. Inventario y almacén.
4. Inspecciones eléctricas.
5. Climatización y refrigeración.
6. Legionella y PCI.

Las escenas rotan cada siete segundos mediante fundido, tienen indicadores manuales y respetan `prefers-reduced-motion`. Cada fondo utiliza una textura WebP embebida y un mockup local sin datos reales.

La escena QR se ha construido de nuevo con equipo, ficha y etiqueta bien definidos. No contiene rayas diagonales ni líneas rojas decorativas; el rojo aparece únicamente como acento puntual.

## PWA y producción

- Título: `IsiVoltPro OT`.
- Manifest, icono, nombre de instalación y metadatos actualizados.
- `base: '/'` en Vite.
- Compilación de calidad: `npm run build -- --base=/`.
- Fallback SPA añadido para mantener rutas internas tras actualizar el navegador.

## Evidencias visuales

- [Escritorio 1440 × 1024](docs/screenshots/isivoltpro-ot-login-desktop.svg)
- [Móvil 390 × 844](docs/screenshots/isivoltpro-ot-login-mobile.svg)

## Validación requerida

La workflow `Quality` ejecuta en cada pull request:

- `npm ci --no-audit --no-fund`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build -- --base=/`

## Riesgos controlados

- Las escenas son recursos locales y no hacen peticiones externas.
- La rotación se detiene cuando el sistema solicita reducción de movimiento.
- El cambio de `base` está alineado con la publicación en la raíz de `ot.isivoltpro.com`.
- No se incluyen secretos ni se modifica `.env.local`.
