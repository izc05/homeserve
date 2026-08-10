# IsiVoltPro OT — OT-05 · Decisión activo ↔ sistema técnico

Fecha: 2026-08-10
Rama: `feat/ot-technical-system-v1`
Estado: **MOV-068 APROBADO**

## 1. Pregunta

¿Debe un activo poder vincularse a un sistema técnico en OT-05?

## 2. Decisión

**Sí, pero únicamente mediante `sistema_id NULLABLE`, sin backfill y sin convertir el sistema en requisito de alta.**

## 3. Evidencia del modelo actual

El modelo real de activos ya contiene:

- tenant;
- instalación obligatoria;
- ubicación opcional;
- nombre;
- datos técnicos básicos.

Los activos se cargan en `WorkOrderCreationCatalog` y su alta rápida está centralizada en `createAsset()`.

La UI de activos consume ese mismo catálogo.

No existe actualmente ninguna relación con sistema técnico.

## 4. Relación aprobada

Añadir:

```sql
alter table public.activos
  add column sistema_id uuid;
```

con FK tenant-safe:

```sql
foreign key (tenant_id, sistema_id)
references public.sistemas_instalacion(tenant_id, id)
```

### Regla de instalación

La FK compuesta por tenant evita cruces de organización, pero por sí sola no garantiza que el sistema pertenezca a la misma `instalacion_id` que el activo.

Por tanto la migración debe añadir una protección adicional que impida:

```text
activo.instalacion_id != sistema.instalacion_id
```

sin hacer obligatorio `sistema_id`.

La opción preferida es una función/trigger pequeño de consistencia, reutilizable posteriormente para OT si procede.

## 5. Opcionalidad

Casos válidos:

- activo sin sistema ✅;
- activo con sistema de su instalación ✅;
- activo con ubicación y sin sistema ✅;
- activo provisional descubierto en campo sin sistema ✅.

Casos inválidos:

- activo tenant A → sistema tenant B ❌;
- activo instalación A1 → sistema instalación A2 ❌.

## 6. Backfill

**Prohibido en OT-05.**

No se asigna sistema `GENERAL` ni se modifica ningún activo existente.

Todos los registros actuales conservan:

```text
sistema_id = NULL
```

hasta que se clasifiquen manualmente.

## 7. Frontend

### Catálogo

`AssetOption` podrá incorporar:

```ts
systemId: string | null
```

sin romper consumidores actuales.

### Alta de activo

`CreateAssetInput` podrá incorporar:

```ts
systemId?: string | null
```

El payload enviará `sistema_id` solamente como nullable.

### Formulario OT avanzado

No se conectará aún automáticamente en MOV-069.

Primero se valida DB + repository/catalog.

### Activos existentes

La UI debe seguir funcionando aunque `systemId === null`.

## 8. Sistema seleccionado y ubicación

Un sistema técnico pertenece a una instalación completa y puede abarcar múltiples ubicaciones.

Por tanto:

- sistema no depende de ubicación;
- activo sí puede mantener su ubicación independiente;
- no se exige que la ubicación tenga una relación directa con el sistema.

## 9. Tests requeridos

Antes de considerar cerrado el vínculo activo ↔ sistema:

1. columna nullable existe;
2. activo sin sistema sigue siendo válido;
3. sistema del mismo tenant + instalación es válido;
4. sistema de otro tenant falla;
5. sistema de otra instalación del mismo tenant falla;
6. cambiar instalación del activo dejando sistema incompatible falla;
7. quitar `sistema_id` vuelve a ser válido;
8. no hay backfill automático.

## 10. Impacto esperado

Bajo:

- una columna nullable;
- una FK;
- un índice parcial;
- una validación de consistencia instalación/sistema;
- ampliación compatible del catálogo y alta de activos.

No modifica:

- estados de OT;
- `create_work_order`;
- RLS de activos;
- historial;
- checklists;
- técnicos;
- mantenimiento programado.

## 11. Próximo movimiento

**MOV-069:** implementar una migración separada para `activos.sistema_id NULLABLE` + consistencia de instalación.

Después:

**MOV-070:** ampliar catálogo/repository de alta de activos y sus tests.

No se tocará `ordenes_trabajo` hasta MOV-071, con auditoría independiente de la RPC `create_work_order`.
