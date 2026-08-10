# IsiVoltPro OT — OT-05 · Validación SQL reproducible

Fecha: 2026-08-10
Rama: `feat/ot-technical-system-v1`
Estado: **MOV-073 EN EJECUCIÓN**

## 1. Motivo

OT-05 introduce migraciones y contratos pgTAP. El workflow `Quality` actual valida:

- instalación Node;
- guard de branding;
- TypeScript;
- ESLint;
- Vitest;
- build.

Pero **no ejecuta Supabase local**, por lo que un Quality verde no demuestra que:

- las migraciones encadenen correctamente;
- PostgreSQL acepte las FK nuevas;
- RLS funcione como se espera;
- la RPC `create_work_order` conserve su contrato real;
- los tests pgTAP pasen.

## 2. Configuración existente auditada

El repositorio contiene:

- `supabase/config.toml`;
- Postgres local major 17;
- migraciones versionadas;
- `npm run supabase:test` → `npx supabase test db`;
- `npm run supabase:lint` → `npx supabase db lint --level warning`;
- script `scripts/setup-local-supabase.ps1` que ya define el orden operativo:
  `supabase start → db reset → db lint → test db`.

## 3. Hallazgo BASE-001

El script local contempla un baseline remoto opcional llamado:

`supabase/migrations/20260717000000_remote_public_baseline.sql`

Ese archivo **no está versionado actualmente** en la rama OT-05.

Sin embargo el repositorio sí contiene:

`202607171200_base_operational_schema.sql`

y el resto de migraciones públicas.

### Consecuencia

No asumiremos que una base limpia es reproducible: lo comprobaremos en un runner vacío.

## 4. Decisión

Crear workflow separado:

`.github/workflows/supabase-quality.yml`

Objetivo exclusivo:

1. checkout;
2. Node 22;
3. arrancar Supabase local con Docker del runner;
4. `supabase db reset`;
5. `supabase db lint --level warning`;
6. `supabase test db`;
7. detener Supabase siempre al finalizar.

## 5. Seguridad

El workflow:

- no hace `supabase login`;
- no hace `supabase link`;
- no usa project ref remoto;
- no usa contraseña remota;
- no hace `db push`;
- no toca mini PC;
- no toca producción;
- no despliega Edge Functions;
- trabaja solo con contenedores efímeros del runner.

`OPENAI_API_KEY` se define únicamente como valor ficticio de CI porque `supabase/config.toml` referencia esa variable para Studio. No es una clave real y no se usa para llamadas externas.

## 6. Alcance del workflow

Se ejecutará cuando una PR hacia `main` modifique:

- `supabase/**`;
- el propio workflow SQL.

También podrá ejecutarse manualmente.

## 7. Criterio de OT-05

OT-05 **no podrá pasar a Ready for review** solo con `Quality` verde.

Requerirá además:

- workflow `Supabase Quality` verde sobre el mismo HEAD final;
- migrations reset correcto;
- db lint correcto;
- todos los pgTAP correctos.

## 8. Tratamiento de fallos

Si el runner limpio falla antes de OT-05:

- no se maquillará el fallo;
- se identificará la primera dependencia histórica ausente;
- se decidirá si corresponde reparar reproducibilidad en OT-05 o separar el arreglo en una fase previa.

Si falla un test nuevo OT-05:

- se corregirá código/migración/test según causa real;
- se volverá a ejecutar desde una base limpia.

## 9. Rollback

Si el workflow no resulta apropiado:

- eliminar `.github/workflows/supabase-quality.yml` antes del merge;
- mantener documentado el hallazgo y requerir ejecución local manual.

Preferencia: conservarlo si funciona, porque todas las fases futuras con DB se beneficiarán de la misma protección.
