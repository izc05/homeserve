# Despliegue de IsiVoltPro OT en el mini PC

## Objetivo

Ejecutar una sola aplicación y un solo contenedor con dos identidades:

- `ot.isivoltpro.es` → **IsiVoltPro OT**.
- `demo-homeserve.isivoltpro.es` → **HomeServe OT Demo**.

Los dos dominios apuntan al mismo servicio local. La aplicación detecta el hostname antes del acceso y confirma la marca mediante la organización autenticada. Los datos continúan aislados por `tenant_id` y Row Level Security.

## Requisitos del mini PC

- Ubuntu con Git, Docker Engine, Docker Compose v2 y `curl`.
- Docker iniciado y accesible por el usuario que ejecuta el despliegue.
- Un proyecto Supabase configurado.
- Cloudflare Tunnel ya creado o acceso para crear uno.

El frontend utiliza únicamente la URL y la clave publicable de Supabase. Nunca se debe copiar `service_role` al mini PC ni al archivo `.env` del frontend.

## Instalación inicial simplificada

Ejecutar una sola línea:

```bash
git clone --branch feat/isivoltpro-ot-ecosystem --single-branch https://github.com/izc05/homeserve.git "$HOME/isivoltpro-ot" && cd "$HOME/isivoltpro-ot" && bash scripts/mini-pc.sh install
```

El instalador:

1. Comprueba Git, Docker, Compose y `curl`.
2. Solicita la URL y la clave publicable de Supabase si no existe un `.env` válido.
3. Guarda `.env` con permisos `600`.
4. Construye la imagen de producción.
5. Arranca el contenedor con reinicio automático.
6. Comprueba `http://127.0.0.1:8088/healthz`.
7. Registra el commit estable para permitir rollback.

El servicio solo escucha en:

```text
127.0.0.1:8088
```

No queda expuesto directamente a la red local ni a Internet.

## Comandos de administración

Desde cualquier ubicación pueden ejecutarse indicando el directorio por defecto `$HOME/isivoltpro-ot`:

```bash
cd "$HOME/isivoltpro-ot"
```

### Actualizar

```bash
bash scripts/mini-pc.sh update
```

La actualización guarda el commit actual, descarga la rama, construye el contenedor y comprueba su salud. Si falla la construcción, el arranque o el healthcheck, restaura automáticamente el commit anterior.

### Estado

```bash
bash scripts/mini-pc.sh status
```

### Logs

```bash
bash scripts/mini-pc.sh logs
```

### Volver a la versión anterior

```bash
bash scripts/mini-pc.sh rollback
```

También se puede indicar un commit concreto:

```bash
bash scripts/mini-pc.sh rollback COMMIT
```

### Detener

```bash
bash scripts/mini-pc.sh stop
```

## Conectar Cloudflare Tunnel

### Túnel gestionado desde el panel de Cloudflare

Crear dos Public Hostnames dentro del mismo túnel:

| Hostname público | Servicio local |
|---|---|
| `ot.isivoltpro.es` | `http://localhost:8088` |
| `demo-homeserve.isivoltpro.es` | `http://localhost:8088` |

No es necesario ejecutar dos instancias de `cloudflared` ni dos contenedores.

### Túnel gestionado localmente

Se incluye la plantilla:

```text
deploy/cloudflared-config.yml.example
```

Copiarla y sustituir el UUID, el usuario y la ruta de credenciales:

```bash
mkdir -p "$HOME/.cloudflared"
cp deploy/cloudflared-config.yml.example "$HOME/.cloudflared/config.yml"
nano "$HOME/.cloudflared/config.yml"
```

Validar las reglas:

```bash
cloudflared tunnel ingress validate
```

Crear las rutas DNS, sustituyendo `NOMBRE_O_UUID`:

```bash
cloudflared tunnel route dns NOMBRE_O_UUID ot.isivoltpro.es
cloudflared tunnel route dns NOMBRE_O_UUID demo-homeserve.isivoltpro.es
```

Instalar el túnel como servicio de Ubuntu usando la ruta explícita del usuario:

```bash
sudo cloudflared --config "$HOME/.cloudflared/config.yml" service install
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

## Verificación final

### Aplicación local

```bash
curl http://127.0.0.1:8088/healthz
```

Debe devolver:

```text
ok
```

### Dominios

```bash
curl -I https://ot.isivoltpro.es
curl -I https://demo-homeserve.isivoltpro.es
```

Después, comprobar visualmente:

1. El dominio real muestra IsiVoltPro OT antes de iniciar sesión.
2. El dominio demo muestra HomeServe OT Demo.
3. Al cambiar de organización, la interfaz adopta su `branding_key`.
4. Un PDF de IsiVoltPro utiliza cabecera y pie IsiVoltPro.
5. Un PDF demo utiliza la identidad HomeServe OT Demo.

## Organizaciones de Supabase

Actualmente están preparadas:

- `IsiVoltPro` con `branding_key = 'isivoltpro'`, sin datos copiados desde la demo.
- `HomeServe Demo Madrid` con `branding_key = 'homeserve-demo'` y datos ficticios.

Ambas utilizan el mismo código y backend, pero sus filas permanecen separadas mediante RLS.

## Seguridad

- El puerto `8088` se publica exclusivamente en `127.0.0.1`.
- No se abren puertos en el router.
- El acceso externo entra por Cloudflare Tunnel.
- `.env` queda fuera de Git y con permisos restringidos.
- El frontend solo recibe la clave publicable de Supabase.
- Las operaciones privilegiadas permanecen en Edge Functions y RPC protegidas.
- HomeServe Demo e IsiVoltPro OT comparten código, pero no datos operativos.
