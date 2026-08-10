# OT-05 — Ciclo de validación final 4

Fecha: 2026-08-10

## Objetivo

Validar sobre un único HEAD limpio, sin editores temporales, toda la fase OT-05 en frontend y base de datos.

## Correcciones incluidas desde el ciclo 3

### Fixture demo

`supabase/tests/fixtures/seed_demo.sql` era descubierto por `pg_prove` como test independiente.

Se renombró a:

`supabase/tests/fixtures/seed_demo.inc`

El contenido conserva exactamente el blob histórico:

`814ae76ec22b110b32f56add4f83ae449996220c`

`demo_seed.sql` incluye ahora el fixture `.inc` dos veces. El archivo ya no puede ser descubierto como test SQL independiente.

### RLS de sistemas técnicos

La comprobación de UPDATE del técnico se reescribió como un bloque `DO` que:

1. ejecuta el UPDATE bajo el usuario técnico;
2. obtiene `ROW_COUNT`;
3. exige exactamente `0` filas modificadas;
4. falla explícitamente si RLS permitiera cualquier modificación.

No se ha modificado ninguna policy ni privilegio para resolver el test.

## Criterio de aceptación

Sobre este mismo HEAD deben terminar en `success`:

### Quality

- npm install;
- branding guard;
- typecheck;
- lint;
- Vitest;
- build.

### Supabase Quality

- Supabase local start;
- db reset desde cero;
- db lint;
- todo pgTAP;
- stop seguro.

## Restricciones mantenidas

No se realiza:

- conexión a Supabase remoto;
- `db push`;
- despliegue;
- modificación de mini PC;
- cambio de producción;
- modificación de `isivoltpro-platform`.

Si los dos workflows quedan verdes, el siguiente movimiento será revisar el diff global de PR #48, actualizar su descripción y pasarla a Ready for review. No habrá merge automático.
