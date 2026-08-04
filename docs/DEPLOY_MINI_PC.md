# Despliegue de IsiVoltPro OT en el mini PC

## Objetivo

Ejecutar una sola aplicación y un solo contenedor con dos identidades:

- `ot.isivoltpro.es` → **IsiVoltPro OT**.
- `demo-homeserve.isivoltpro.es` → **HomeServe OT Demo**.

Los dos dominios apuntan al mismo servicio. La aplicación detecta el hostname y cambia nombre, colores, metadatos y manifiesto PWA. Los datos continúan aislados por organización mediante `tenant_id` y RLS.

## 1. Preparar el repositorio

```bash
git clone https://github.com/izc05/homeserve.git isivoltpro-ot
cd isivoltpro-ot
git checkout feat/isivoltpro-ot-ecosystem
cp .env.example .env
```

Completar `.env`:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
VITE_BASE_PATH=/
```

No se debe introducir `service_role` en este archivo ni en el contenedor web.

## 2. Construir y arrancar

```bash
docker compose build --pull
docker compose up -d
```

Comprobar el servicio local:

```bash
curl http://127.0.0.1:8088/healthz
```

Debe responder:

```text
ok
```

## 3. Conectar Cloudflare Tunnel

En la configuración del túnel, ambos hostnames deben dirigir al mismo origen:

```yaml
ingress:
  - hostname: ot.isivoltpro.es
    service: http://localhost:8088
  - hostname: demo-homeserve.isivoltpro.es
    service: http://localhost:8088
  - service: http_status:404
```

La variable `VITE_PRODUCT_BRAND` debe permanecer vacía en este despliegue compartido. El dominio determina la identidad inicial.

## 4. Organizaciones de Supabase

La tabla `tenants` dispone de `branding_key`:

- `isivoltpro`
- `homeserve-demo`

La organización real debe usar `isivoltpro`. La organización de demostración debe usar `homeserve-demo` y contener únicamente clientes, técnicos y OTs ficticios.

## 5. Actualizar la aplicación

```bash
cd isivoltpro-ot
git pull
docker compose build --pull
docker compose up -d
```

Docker sustituye el contenedor manteniendo el mismo puerto local. Supabase conserva los datos porque no se almacenan dentro del contenedor web.

## 6. Recuperación

Consultar estado y logs:

```bash
docker compose ps
docker compose logs --tail=200 isivoltpro-ot
```

Volver al commit anterior:

```bash
git log --oneline -10
git checkout COMMIT_ANTERIOR
docker compose build
docker compose up -d
```

## Seguridad

- El puerto `8088` solo se publica en `127.0.0.1`.
- No se abren puertos en el router.
- El acceso externo entra por Cloudflare Tunnel.
- El frontend solo recibe la clave publicable de Supabase.
- Las operaciones privilegiadas permanecen en Edge Functions y RPC protegidas.
- HomeServe Demo y IsiVoltPro OT comparten código, pero nunca deben compartir filas fuera de las políticas RLS.
