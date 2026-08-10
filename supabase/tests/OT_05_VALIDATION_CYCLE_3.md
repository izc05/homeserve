# OT-05 — Ciclo de validación SQL 3

Fecha: 2026-08-10

## Objetivo

Forzar una validación completa y simultánea de `Quality` y `Supabase Quality` sobre un HEAD limpio, sin workflows temporales de edición.

## Estado antes de este ciclo

### Frontend

El último ciclo completo de `Quality` terminó en verde con:

- install;
- guard de branding;
- typecheck;
- lint;
- Vitest;
- build.

### Base de datos

Los dos ciclos anteriores de `Supabase Quality` demostraron:

- `supabase start` reproducible;
- `supabase db reset` reproducible desde cero;
- todas las migraciones históricas + OT-05 aplicables;
- `supabase db lint --level warning` limpio;
- contrato activo → sistema aprobado;
- contrato OT → sistema aprobado;
- contrato hardened de `create_work_order` conservado.

## Ajustes cerrados después del ciclo 2

### 1. Fixture demo dentro del árbol de tests

`supabase test db` no resolvía el include hacia `../demo/seed_demo.sql` aunque el archivo existía en el commit.

Se añadió:

`supabase/tests/fixtures/seed_demo.sql`

El fixture es **idéntico byte a byte** al seed histórico recuperado:

Git blob:

`814ae76ec22b110b32f56add4f83ae449996220c`

`demo_seed.sql` usa ahora dos includes relativos dentro del mismo árbol de tests:

`\ir fixtures/seed_demo.sql`

El seed original de `supabase/demo/seed_demo.sql` permanece intacto.

### 2. UUID de fixture OT-05

Se corrigió una única UUID `tenant_id` mal formada en la primera instalación del test `installation_technical_systems_v1.sql`.

No se modificaron IDs de negocio ni lógica de RLS.

### 3. Contrato `private`

Ya validado en el ciclo 2: el test exige una única `private.next_work_order_code_internal()`, sin impedir otros helpers privados legítimos añadidos posteriormente.

Se mantienen owner, SECURITY DEFINER, search_path, ACL y ausencia de wrapper público.

## Criterio del ciclo 3

Sobre el mismo HEAD deben quedar en `success`:

### Quality

- install;
- branding;
- typecheck;
- lint;
- Vitest;
- build.

### Supabase Quality

- start;
- db reset;
- db lint;
- conjunto completo pgTAP;
- stop seguro.

## Restricciones

Este ciclo no:

- conecta a Supabase remoto;
- hace `db push`;
- despliega;
- toca mini PC;
- modifica datos reales;
- modifica `isivoltpro-platform`.

Si ambos pipelines terminan verdes, el siguiente movimiento será la revisión completa del diff de PR #48 y la actualización de su descripción antes de pasar a Ready for review.
