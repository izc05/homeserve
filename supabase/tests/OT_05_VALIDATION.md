# OT-05 — Validación SQL reproducible

Fecha: 2026-08-10

Este archivo documenta la validación de base de datos de **OT-05 · Sistema técnico v1**. No es un test ejecutable; su ubicación bajo `supabase/**` hace que cualquier actualización relevante de este registro vuelva a disparar `Supabase Quality` sobre el mismo HEAD que `Quality`.

## Primer ciclo de Supabase Quality

El primer runner limpio demostró correctamente:

- `supabase start` ✅
- `supabase db reset` ✅
- todas las migraciones históricas + OT-05 aplicadas ✅
- `supabase db lint --level warning` ✅
- contrato `asset_technical_system_link_v1.sql` ✅
- contrato `work_order_technical_systems_v1.sql` ✅

El conjunto pgTAP global reveló tres incidencias independientes.

### SQL-OT05-001 — UPDATE filtrado por RLS

El test inicial esperaba que un técnico recibiera una excepción al ejecutar `UPDATE sistemas_instalacion`.

PostgreSQL aplicó correctamente la política RLS filtrando la fila, por lo que la sentencia actualizó **0 registros** sin lanzar excepción.

Corrección:

- se mantiene la política RLS;
- no se concede ningún permiso nuevo;
- el test ahora verifica `0` filas modificadas.

### SQL-LEGACY-001 — seed demo ausente

`supabase/tests/demo_seed.sql` referencia:

`supabase/demo/seed_demo.sql`

El archivo no estaba presente en la rama actual, aunque GitHub conserva su versión histórica exacta.

Se recuperó el blob original del commit:

`1d658a65b2eb2d717506e28b23d6db43e4692a80`

Blob restaurado:

`814ae76ec22b110b32f56add4f83ae449996220c`

No se reconstruyó ni reinterpretó el dataset: se recuperó el archivo histórico idéntico.

### SQL-LEGACY-002 — expectativa obsoleta del esquema `private`

`function_execute_privileges.sql` esperaba que el esquema `private` contuviera una única función total.

Migraciones posteriores incorporaron helpers privados legítimos para checklist y evidencia, por lo que esa expectativa dejó de representar la arquitectura real.

La aserción #9 ahora exige específicamente que exista una única:

`private.next_work_order_code_internal()`

Se mantienen sin cambios las verificaciones posteriores de:

- propietario `postgres`;
- `SECURITY DEFINER`;
- `search_path=pg_catalog`;
- ausencia de EXECUTE para `PUBLIC` y `anon`;
- acceso mínimo esperado para `authenticated`;
- ausencia de wrapper público;
- `create_work_order` como `SECURITY INVOKER`.

## Criterio final

OT-05 solo podrá pasar a revisión cuando, sobre el **mismo HEAD**:

1. `Quality` termine en `success`;
2. `Supabase Quality` termine en `success`;
3. `db reset` sea reproducible desde un runner vacío;
4. `db lint` quede limpio;
5. todo el conjunto pgTAP pase;
6. no exista despliegue ni conexión a producción.
