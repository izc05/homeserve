# Datos demostrativos

`seed_demo.sql` provisiona exclusivamente el tenant ficticio **HomeServe Demo
Madrid**. No es el seed general de Supabase y no se ejecuta durante `db reset`.

Antes de usarlo deben existir y estar confirmadas, mediante Auth Admin, estas
dos cuentas ficticias:

- `admin.demo@example.test`
- `tecnico.demo@example.test`

El script no contiene contraseñas, claves, tokens, project refs ni altas en
`auth.users`. Valida el destino, detiene la ejecución si encuentra datos ajenos
y aplica todos sus cambios como una única sentencia transaccional.

El procedimiento completo, incluidas la verificación previa y la retirada de
la demo, está en [`../../docs/PROVISION_DEMO.md`](../../docs/PROVISION_DEMO.md).

La prueba `../tests/demo_seed.sql` incluye este archivo con `\ir`. Debe
ejecutarse desde un cliente `psql` que tenga visible el árbol del repositorio;
esto permite probar el archivo real dos veces sin copiar su lógica al test. La
suite estándar restante continúa ejecutándose con `supabase test db`.
