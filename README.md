# IsiVoltPro OT

Gestor profesional de órdenes de trabajo para mantenimiento técnico y primera aplicación operativa del ecosistema IsiVoltPro.

## Modelo de producto

Este repositorio contiene **una única aplicación** con dos identidades configurables:

- **IsiVoltPro OT**: producto principal para uso real.
- **HomeServe OT Demo**: demostración funcional del mismo producto con datos ficticios.

No existen dos desarrollos independientes. Las mejoras de técnicos, órdenes, checklist, fotos, firmas, informes y seguridad se comparten automáticamente. La marca se selecciona por dominio y queda asociada también a la organización mediante `tenants.branding_key`.

Dominios previstos:

- `ot.isivoltpro.es`
- `demo-homeserve.isivoltpro.es`

## Flujo principal

1. El responsable crea y prepara la OT.
2. Define checklist y requisitos de cierre.
3. Asigna la OT a un técnico activo.
4. El técnico acepta, inicia y ejecuta sus OT.
5. Registra checklist, observaciones, fotos, materiales y firma.
6. Finaliza la intervención y se genera el informe provisional cuando corresponde.
7. El responsable revisa, solicita correcciones o valida.
8. Se genera y conserva el informe final privado, versionado e inmutable.

## Experiencias de usuario

- **Panel central**: administración, coordinación, asignación, planificación, seguimiento, revisión, informes y usuarios.
- **Zona técnico**: consulta y ejecución móvil de las OT asignadas, sin acceso a gestión ni a OT de otros técnicos.

## Tecnología

- React + TypeScript + Vite.
- Supabase Auth, PostgreSQL, Storage privado y Edge Functions.
- Row Level Security para aislamiento real por organización.
- Firma táctil e informes PDF versionados.
- PWA y futura envoltura Capacitor.
- Vitest, ESLint, TypeScript y GitHub Actions.
- Docker multietapa con Nginx para el mini PC.

## Desarrollo

```bash
npm ci
npm run dev
```

Variables necesarias:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

## Calidad

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

GitHub Actions valida además la construcción completa de la imagen Docker de producción.

## Mini PC

```bash
cp .env.example .env
docker compose build --pull
docker compose up -d
curl http://127.0.0.1:8088/healthz
```

El servicio solo escucha en `127.0.0.1:8088`. Los dos dominios pueden apuntar al mismo contenedor mediante Cloudflare Tunnel. Consulta [`docs/DEPLOY_MINI_PC.md`](docs/DEPLOY_MINI_PC.md).

## Estados oficiales de OT

- `BORRADOR`
- `ASIGNADA`
- `ACEPTADA`
- `EN_CURSO`
- `BLOQUEADA`
- `FINALIZADA_TECNICO`
- `VALIDADA`
- `CANCELADA`

## Documentación principal

- [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md): estado real, validaciones y bloqueos.
- [`docs/DEPLOY_MINI_PC.md`](docs/DEPLOY_MINI_PC.md): instalación Docker y Cloudflare.
- [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md): visión del ecosistema IsiVoltPro.
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): alcance funcional.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitectura técnica.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de datos y permisos.
- [`docs/SECURITY.md`](docs/SECURITY.md): requisitos de seguridad.
- [`docs/QA_ACCEPTANCE.md`](docs/QA_ACCEPTANCE.md): pruebas y criterios de aceptación.

## Reglas innegociables

- Ningún permiso crítico depende solo de React.
- Un técnico no puede leer ni modificar la OT de otro técnico.
- Toda OT validada queda inmutable salvo reapertura administrativa auditada.
- No se puede finalizar una OT con requisitos obligatorios incompletos.
- Los informes finales se versionan y almacenan de forma privada.
- Toda acción crítica queda registrada en auditoría.
- No se almacenan credenciales privadas en el frontend.
- HomeServe OT Demo y IsiVoltPro OT comparten código, pero no datos fuera de las políticas RLS.
