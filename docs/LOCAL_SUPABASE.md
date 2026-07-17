# Supabase local gratuito

Este proyecto puede probar migraciones, RLS, autenticación y RPC en el PC sin crear ramas de pago y sin alterar la base alojada.

## Qué se necesita

- Windows 10/11 con Docker Desktop iniciado.
- Node.js 20 o posterior; el proyecto usa Node 22.
- Git.
- Espacio libre para las imágenes de Docker.

El entorno local no consume cuota de Supabase. Sí utiliza memoria, CPU y disco del PC mientras está funcionando.

## Primer arranque en Windows

Desde PowerShell, dentro del repositorio:

```powershell
git checkout feature/create-assign-work-orders
npm install
npm run supabase:local
```

El primer arranque tarda más porque Docker descarga las imágenes del entorno Supabase.

## Qué hace el comando

1. Comprueba que Docker está iniciado y que Node es compatible.
2. Si todavía no existe una línea base local, inicia sesión en Supabase y enlaza el proyecto `ubfbhzovebrmmjpyygnm`.
3. Ejecuta un `db dump` de **solo el esquema público**, sin descargar datos.
4. Guarda esa copia como una migración anterior a los cambios nuevos.
5. Arranca PostgreSQL, Auth, Storage, Studio y el resto de servicios en Docker.
6. Destruye y reconstruye únicamente la base local mediante `db reset`.
7. Aplica la línea base y la migración nueva de creación/asignación de OT.
8. Ejecuta el linter de PostgreSQL y las pruebas pgTAP.
9. Genera `.env.local` con la URL y la clave publicable del Supabase local.

## Lo que nunca hace

El script no contiene ni ejecuta:

- `supabase db push`;
- `supabase db reset --linked`;
- escrituras en las tablas del proyecto alojado;
- descargas de datos personales;
- claves secretas o `service_role` en el repositorio.

La contraseña de la base puede solicitarse durante el enlace. Se introduce únicamente en la terminal y no debe copiarse en GitHub, ChatGPT ni archivos del proyecto.

## Direcciones locales

Cuando el arranque finaliza:

- Aplicación Vite: `http://127.0.0.1:5173`
- API local: `http://127.0.0.1:54321`
- PostgreSQL local: `127.0.0.1:54322`
- Supabase Studio: `http://127.0.0.1:54323`
- Correos de prueba: `http://127.0.0.1:54324`

Para abrir la aplicación:

```powershell
npm run dev
```

## Comandos habituales

```powershell
# Arrancar el entorno ya configurado
npm run supabase:start

# Reconstruir únicamente la base local
npm run supabase:reset

# Ejecutar las pruebas SQL/RLS locales
npm run supabase:test

# Revisar funciones y SQL de PostgreSQL
npm run supabase:lint

# Parar los contenedores conservando la base local
npm run supabase:stop
```

Para volver a capturar el esquema público remoto después de un cambio aprobado:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-local-supabase.ps1 -RefreshBaseline
```

## Línea base generada

El primer arranque crea:

```text
supabase/migrations/20260717000000_remote_public_baseline.sql
```

Ese archivo contiene estructura SQL, funciones, triggers, RLS y permisos, pero no filas de las tablas. Antes de integrarlo se revisará para retirar ruido del `pg_dump` y confirmar que no contiene información sensible.

## Criterio para cerrar el PR #9

El PR puede pasar de borrador a listo cuando se cumpla todo esto:

- `supabase db reset` termina correctamente;
- `supabase db lint --level warning` no encuentra errores críticos;
- `supabase test db` termina en `PASS`;
- `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` siguen en verde;
- se comprueba que el administrador crea y asigna OT;
- un técnico no puede crear, asignar ni consultar OT ajenas;
- no se ha ejecutado ninguna orden de despliegue remoto.
