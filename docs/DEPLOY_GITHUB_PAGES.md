# Despliegue reproducible en GitHub Pages

Este runbook prepara la demostración estática de **HomeServe Operaciones**. No
autoriza crear el proyecto Supabase, aplicar migraciones, generar usuarios ni
publicar la web.

La provisión posterior de usuarios y datos ficticios se realiza únicamente con
el runbook separado [`PROVISION_DEMO.md`](PROVISION_DEMO.md), después de aplicar
y verificar las migraciones en el proyecto demo correcto.

## Alcance de la URL

La única ruta garantizada es:

```text
https://izc05.github.io/homeserve/
```

Vite conserva `base: '/homeserve/'`. No se añade un fallback `404.html` ni se
garantiza la recarga directa de rutas internas.

## 1. Crear el proyecto Supabase Cloud

Esta operación se realizará en una fase autorizada posterior. El proyecto debe
ser nuevo y no debe recibir volcados ni datos de la base operativa.

Antes de usarlo:

1. Revisar la cadena completa de migraciones en un entorno aislado.
2. Confirmar RLS y grants para `anon` y `authenticated`.
3. Abrir **Settings → Data API** y revisar **Exposed schemas**.
4. Mantener `private` fuera de los esquemas expuestos.
5. Obtener la Project URL y una clave con formato `sb_publishable_...`.

Está absolutamente prohibido usar en Pages una clave `service_role`, una clave
`sb_secret_...`, una contraseña de PostgreSQL o cualquier token administrativo.

## 2. Configurar Auth

En Supabase, abrir **Authentication → URL Configuration** y configurar:

```text
Site URL:    https://izc05.github.io/homeserve/
Redirect URL: https://izc05.github.io/homeserve/**
```

Comprobar los flujos de acceso, confirmación de correo y recuperación después
del primer despliegue autorizado.

## 3. Configurar GitHub Actions

En el repositorio, abrir **Settings → Secrets and variables → Actions**.

En **Variables**, crear:

```text
VITE_SUPABASE_URL
```

Su valor será la URL HTTPS del nuevo proyecto Supabase.

En **Secrets**, crear:

```text
VITE_SUPABASE_PUBLISHABLE_KEY
```

Debe contener únicamente una clave publicable `sb_publishable_...`. Aunque una
clave publicable termina incorporada al bundle y no es una credencial privada,
se guarda como secret para evitar su impresión accidental en los logs.

No crear variables con nombres alternativos ni copiar `.env.example` durante
el workflow.

## 4. Activar GitHub Pages

En **Settings → Pages → Build and deployment**, seleccionar:

```text
Source: GitHub Actions
```

El workflow utiliza permisos mínimos:

- `contents: read`;
- `pages: write`;
- `id-token: write`.

La instalación se realiza con `npm ci`, el build con `npm run build` y el
artefacto procede únicamente de `dist`.

## 5. Rama y ejecución manual

El despliegue automático se activa exclusivamente por un `push` a `main`. La
rama `feat/mvp-ot-operativa` no es una fuente automática de Pages.

`workflow_dispatch` solo está disponible cuando el archivo del workflow ya
existe en la rama predeterminada. Su presencia no garantiza poder desplegar una
versión que exista únicamente en una rama feature.

Antes de publicar se decidirá expresamente entre:

1. abrir PR, revisar y hacer merge a `main`; o
2. autorizar un workflow temporal que seleccione de forma explícita la versión
   a desplegar.

No se añadirá un trigger automático para la rama feature.

## 6. Comprobación del despliegue

Tras una ejecución autorizada:

1. Confirmar que los jobs `build` y `deploy` terminan correctamente.
2. Abrir `https://izc05.github.io/homeserve/` en una sesión privada.
3. Revisar que los assets se sirven desde `/homeserve/`.
4. Confirmar el título y la marca **HomeServe Operaciones**.
5. Revisar consola y red sin ejecutar acciones mutantes sobre OT.
6. Probar acceso y cierre de sesión con usuarios exclusivamente ficticios.

## 7. Rollback

Para recuperar el commit desplegado anteriormente:

1. Abrir **Actions** y localizar la última ejecución correcta anterior.
2. Verificar su SHA y el artefacto asociado.
3. Usar **Re-run all jobs** para reconstruir y volver a desplegar ese commit.
4. Confirmar la URL y realizar el smoke test.

Si la ejecución anterior ya no puede repetirse, crear un revert explícito en
`main` y dejar que el workflow despliegue el nuevo commit de reversión. No hacer
force-push ni reescribir el historial de `main`.

## 8. Validación previa local

La preparación debe superar:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

El build local de validación usa una URL y una clave publicable ficticias. No
se debe crear `.env`, enlazar Supabase ni reutilizar credenciales reales.
