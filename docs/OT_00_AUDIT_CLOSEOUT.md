# IsiVoltPro OT — Cierre de auditoría OT-00

Fecha: 2026-08-10
Rama: `docs/isivoltpro-ot-execution-master`
Estado: **auditoría documental cerrada; pendiente de revisión en PR**

## 1. Decisión principal

No se reconstruirá IsiVoltPro OT desde cero.

El repositorio contiene un núcleo operativo valioso que debe conservarse y evolucionarse de forma incremental:

- RLS y aislamiento;
- RPC de creación/asignación/ciclo;
- estados canónicos;
- visitas;
- checklist;
- fotografías/evidencias;
- firmas;
- cierre guiado;
- revisión/corrección;
- informes versionados;
- auditoría;
- pruebas TypeScript y SQL.

## 2. Frontera definitiva

### OT

Propietario de trabajos, ejecución, visitas, evidencias, tiempos, revisión y parte PDF.

### Platform

Propietario futuro de organización, usuarios, clientes, instalaciones y permisos/capabilities compartidos.

### Activos

Propietario de identidad física/documental, activos y QR/NFC.

### Mantenimiento

Propietario de estado técnico de instalaciones, sistemas, planes, frecuencias y preventivos.

### Almacén

Propietario de stock y movimientos.

OT utiliza referencias a esos datos, pero no debe seguir expandiendo sus catálogos maestros internos.

## 3. Máquina de estados verificada

Estados canónicos:

```text
BORRADOR
ASIGNADA
ACEPTADA
EN_CURSO
BLOQUEADA
FINALIZADA_TECNICO
VALIDADA
CANCELADA
```

Las migraciones antiguas contienen estados legacy, pero una migración posterior de normalización redefine las RPC al contrato actual.

Otra migración posterior obliga a `block_work_order` a usar únicamente `BLOQUEADA`.

**Decisión:** mantener `statusCompatibility` temporalmente para históricos; no existe evidencia de que debamos crear una nueva máquina de estados.

## 4. Creación de OT verificada

El schema frontend actual ya permite:

- ubicación opcional;
- activo opcional;
- técnico opcional.

La RPC vigente del repositorio:

- usa `SECURITY INVOKER`;
- comprueba permisos;
- exige instalación válida del tenant;
- valida ubicación/activo si existen;
- valida técnico si se asigna;
- crea `BORRADOR` sin técnico;
- crea `ASIGNADA` con técnico;
- registra auditoría.

**Consecuencia:** el futuro modo rápido puede construirse sin romper la base de datos.

## 5. Seguridad de funciones verificada

La migración de endurecimiento posterior:

- revoca exposición genérica de funciones;
- concede explícitamente RPC necesarias a `authenticated`;
- mantiene `create_work_order` como `SECURITY INVOKER`;
- mueve el generador de código a esquema `private`;
- mantiene validaciones de tenant y actor.

**Decisión:** conservar esta disciplina en cualquier RPC nueva.

## 6. Cierre guiado verificado

La migración más reciente de cierre técnico revisada comprueba en servidor, según configuración:

- resumen de trabajo;
- checklist;
- fotos vinculadas;
- fotos iniciales/finales;
- mediciones;
- materiales;
- prueba funcional;
- firma técnica;
- firma del responsable;
- informe.

Después pasa la OT a `FINALIZADA_TECNICO`.

La revisión administrativa permite:

- `validada` → `VALIDADA`;
- `correccion_solicitada` → `EN_CURSO`.

Todo queda auditado.

**Decisión:** esta lógica es una fortaleza y se conserva.

## 7. Bloqueos

El estado ya está normalizado a `BLOQUEADA`.

Deuda a resolver en fase posterior:

- el texto del bloqueo se reutiliza actualmente en un campo pensado para reasignación;
- falta una estructura propia con motivo, fechas y responsable de resolución.

Modelo objetivo:

```text
reason
notes
blocked_at
resolved_at
expected_resolution_at
resolution_owner
```

No se toca en OT-00.

## 8. Fugas de alcance confirmadas

### Activos

Existen `AssetsWorkspace` y `AssetHistoryPanel`, y la navegación contiene `Equipos FV`.

Decisión:

- retirar `Equipos FV` como módulo principal en OT-01;
- conservar selección/resumen de activo para la OT;
- trasladar la responsabilidad maestra a Activos.

### Clientes/instalaciones

Existe CRUD completo dentro de OT.

Decisión:

- mantener por compatibilidad hasta que Platform lo sustituya;
- introducir directorios/adapters;
- no seguir expandiéndolo como maestro definitivo.

### Creación rápida de instalación/activo desde OT

`workOrderCommands.ts` contiene creación directa de instalación y activo.

Decisión:

- conservar temporalmente para no romper flujo;
- clasificar como `MOVE + BRIDGE`;
- no ampliar;
- sustituir posteriormente por integración con Platform/Activos.

### Mantenimiento programado

Existen repositorio y varias RPC/migraciones.

Decisión:

- no eliminar migraciones aplicadas;
- no ampliar el motor dentro de OT;
- Mantenimiento será propietario del plan;
- OT recibirá trabajos y devolverá resultados mediante contrato.

## 9. Roles

El frontend contiene comparaciones directas de:

- `admin_cliente`;
- `coordinador`;
- `tecnico`;
- `tecnico_externo`;
- `cliente_lectura`.

Decisión:

```text
rol legacy
  ↓
capability adapter
  ↓
componentes OT
```

No se rompe el sistema actual hasta que Platform proporcione capacidades reales.

## 10. Frontend

`src/App.tsx` es un punto de acoplamiento grande.

Decisión:

- refactor incremental;
- primero layout/navegación;
- después páginas;
- después adapters/capabilities;
- sin reescritura total.

## 11. Tests y CI

Existe una base amplia de pruebas:

- unitarias/componentes;
- RLS;
- creación/asignación;
- privilegios de funciones;
- cierre guiado;
- informes/bloqueos;
- checklist;
- fotografías;
- auditoría.

`quality.yml` ya ejecuta en PR:

- `npm ci`;
- control de branding visible;
- typecheck;
- lint;
- tests;
- build.

Deuda separada:

- consolidar `ci.yml` y `quality.yml` en versión Node/npm coherente.

No se mezclará esa limpieza con la primera PR funcional.

## 12. Contrato de integración creado

`docs/OT_INTEGRATION_CONTRACT_DRAFT.md` define:

- IDs comunes;
- sesión/contexto;
- capabilities;
- Client/Installation/Asset/Technician directories;
- snapshots históricos;
- eventos entrantes/salientes;
- deep links;
- QR/NFC;
- integración Mantenimiento/Almacén/apps técnicas;
- idempotencia;
- versionado;
- estrategia progresiva de migración.

## 13. Documentación alineada en OT-00

Actualizados:

- `README.md`;
- `docs/PRODUCT_SPEC.md`;
- `docs/ARCHITECTURE.md`;
- `docs/ROADMAP.md`;
- `docs/UI_FLOWS.md`.

Creados:

- `docs/OT_EXECUTION_MASTER_PLAN.md`;
- `docs/OT_DEVELOPMENT_LOG.md`;
- `docs/OT_AUDIT_MATRIX.md`;
- `docs/OT_INTEGRATION_CONTRACT_DRAFT.md`;
- este cierre `docs/OT_00_AUDIT_CLOSEOUT.md`.

## 14. Cambios NO realizados

OT-00 no ha modificado:

- código funcional;
- tablas;
- datos;
- migraciones;
- RLS desplegada;
- Supabase de producción;
- mini PC;
- Docker productivo;
- Cloudflare;
- dominios;
- `isivoltpro-platform`.

## 15. Primera fase funcional propuesta tras aprobación

Rama prevista:

`refactor/ot-identity-domain-cleanup`

Alcance restringido:

1. retirar `Equipos FV` de navegación OT;
2. sustituir textos específicos por activo genérico;
3. revisar restos visibles de marca legacy;
4. aislar mejor la demo donde afecte a branding;
5. conservar selección/referencia de activo;
6. no tocar todavía base de datos;
7. añadir/actualizar tests de navegación y branding;
8. ejecutar typecheck + lint + tests + build;
9. revisión visual PC/móvil;
10. documentar rollback.

## 16. Condición para avanzar

No se inicia OT-01 desde esta rama documental.

Primero:

1. revisar esta PR documental;
2. comprobar que solo contiene documentación;
3. validar que no contradice Platform;
4. fusionar la documentación;
5. crear OT-01 desde el nuevo `main`.
