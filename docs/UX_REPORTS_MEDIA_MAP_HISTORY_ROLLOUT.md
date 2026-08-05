# Despliegue revisado: medios, mapas, informes e historial

> Este documento **no autoriza un despliegue automático**. La migración y el frontend deben revisarse en el PR antes de tocar el Supabase local del mini PC.

## Alcance

Migración incluida:

```text
supabase/migrations/20260805093000_stabilize_media_maps_and_brand.sql
```

Añade:

- permisos tenant-scoped para fotografías de instalaciones;
- edición de título, descripción y categoría;
- imagen principal privada de cliente;
- latitud y longitud opcionales en instalaciones;
- buckets privados y RPC estrechas;
- compatibilidad temporal con rutas antiguas de fotografías.

No modifica contraseñas, secretos, `tenant_id`, `user_id`, slug, `branding_key`, Cloudflare Tunnel ni el puerto 8082.

## Orden obligatorio

1. Revisar y aprobar el PR.
2. Detener cualquier escritura administrativa durante la ventana de mantenimiento.
3. Realizar copia de seguridad completa del PostgreSQL local.
4. Probar la migración en una restauración o entorno local equivalente.
5. Ejecutar los tests SQL de Supabase.
6. Aplicar la migración en producción local.
7. Verificar RLS con administrador, coordinador, técnico y otro tenant.
8. Desplegar el frontend **después** de que la base admita las columnas y RPC nuevas.

No desplegar primero el frontend: las consultas de clientes e instalaciones esperan las columnas nuevas.

## Copia de seguridad

Desde el mini PC, usando las credenciales del PostgreSQL local y sin copiar secretos al repositorio:

```bash
mkdir -p ~/backups/isivoltpro-ot
STAMP="$(date +%Y%m%d-%H%M%S)"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$HOME/backups/isivoltpro-ot/pre-media-map-$STAMP.dump" \
  "$DATABASE_URL"
```

Comprobar que el archivo existe y no está vacío:

```bash
ls -lh "$HOME/backups/isivoltpro-ot/pre-media-map-$STAMP.dump"
pg_restore --list "$HOME/backups/isivoltpro-ot/pre-media-map-$STAMP.dump" | head
```

## Aplicación de la migración

Primero, en una base restaurada o instancia local de prueba:

```bash
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260805093000_stabilize_media_maps_and_brand.sql
```

Después ejecutar:

```bash
npx supabase db lint --level warning
npx supabase test db
```

Solo cuando la revisión y las pruebas sean satisfactorias, repetir la aplicación contra el Supabase local de producción.

## Verificación funcional mínima

### Administrador y coordinador

- Subir JPG, PNG y WebP en una instalación.
- Confirmar ruta `tenant_id/instalacion_id/uuid-nombre.ext`.
- Editar título, descripción y categoría.
- Marcar foto principal.
- Eliminar foto.
- Añadir, cambiar y eliminar imagen principal de cliente.
- Guardar coordenadas y abrir “Cómo llegar”.

### Técnico

- Consultar fotografías de instalaciones del tenant.
- No poder subir, editar, marcar principal ni eliminar.

### Aislamiento

- Un usuario de otro tenant no puede leer metadatos, objetos privados ni URLs firmadas.
- Un usuario no autenticado no puede ejecutar RPC ni acceder a Storage.

### Fallo entre Storage y base de datos

Forzar un rechazo de la RPC después de subir el objeto y comprobar que el frontend elimina el archivo huérfano.

## Limpieza de referencias demo

El script:

```text
scripts/cleanup-demo-branding.sql
```

trabaja únicamente con valores exactos conocidos y, por defecto, ejecuta `ROLLBACK`.

Previsualización:

```bash
psql "$DATABASE_URL" \
  -v tenant_id='UUID-TENANT-DEMO' \
  -f scripts/cleanup-demo-branding.sql
```

Aplicación explícita, solo después de revisar el resultado y conservar la copia:

```bash
psql "$DATABASE_URL" \
  -v tenant_id='UUID-TENANT-DEMO' \
  -v apply=true \
  -f scripts/cleanup-demo-branding.sql
```

No modifica `audit_logs`: las etiquetas históricas exactas se normalizan visualmente en el frontend.

## Rollback

La opción segura es restaurar la copia completa, porque la migración modifica políticas de Storage además de añadir columnas y funciones.

1. Detener temporalmente el frontend para impedir nuevas escrituras.
2. Crear una copia adicional del estado fallido para análisis.
3. Restaurar el dump previo en una base vacía o siguiendo el procedimiento operativo del mini PC.
4. Verificar tenants, usuarios, OT, Storage y RLS.
5. Revertir el commit del frontend o desplegar el commit anterior.

Ejemplo de restauración en una base preparada para reemplazo:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  "$HOME/backups/isivoltpro-ot/pre-media-map-$STAMP.dump"
```

No ejecutar `DROP COLUMN` manualmente sobre producción como primera opción. Podría perder rutas de cliente o coordenadas ya registradas y no restaura por sí solo las políticas anteriores.

## Capturas y revisión visual

Antes de aprobar el PR, obtener capturas reales desde una ejecución local de la rama:

- Informes en escritorio y móvil.
- Cliente con imagen y fallback de iniciales.
- Instalación con coordenadas y mapa.
- Historial con colores, iconos, texto y transición de estado.

Las capturas deben proceder de datos demo, nunca de información real sensible.
