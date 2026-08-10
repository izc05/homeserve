# IsiVoltPro OT — OT-05 · Decisión OT → sistema técnico

Fecha: 2026-08-10
Rama: `feat/ot-technical-system-v1`
Estado: **DECISIÓN APROBADA PARA OT-05 v1**

## 1. Contexto

La RPC vigente `public.create_work_order` no es la versión histórica inicial.

La versión efectiva fue endurecida por:

`supabase/migrations/20260721174937_harden_function_execute_privileges.sql`

Características que deben preservarse:

- `SECURITY INVOKER`;
- `search_path = public`;
- numeración mediante `private.next_work_order_code_internal()`;
- ACL explícita;
- ejecución solo para `authenticated`;
- sin exposición `PUBLIC`, `anon` ni `service_role`;
- firma actual estable de 16 parámetros;
- compatibilidad con llamadas posicionales y PostgREST existentes.

## 2. Riesgo detectado

Añadir `system_uuid uuid default null` directamente a la firma obligaría a:

- eliminar/recrear la firma actual;
- actualizar contratos ACL globales;
- revisar cada consumidor PostgREST;
- revisar llamadas posicionales históricas;
- asumir riesgo innecesario dentro de una fase cuyo objetivo principal es introducir el contexto técnico.

Crear una segunda sobrecarga también aumentaría la superficie pública de funciones y duplicaría lógica o contratos.

## 3. Decisión OT-05

Mantener **exactamente la firma pública actual** de `create_work_order`.

El campo existente `requirements_json` actuará temporalmente como sobre de transporte para una clave adicional:

```json
{
  "sistema_id": "uuid-opcional",
  "requiere_checklist": true,
  "requiere_fotos_finales": true
}
```

La RPC:

1. extraerá `sistema_id` del JSON de entrada;
2. lo convertirá a UUID solo si existe;
3. validará tenant + instalación + sistema;
4. comprobará coherencia con el activo cuando este ya tenga `sistema_id`;
5. guardará el valor en `ordenes_trabajo.sistema_id`;
6. seguirá reconstruyendo `normalized_requirements` únicamente con claves `requiere_*`;
7. por tanto `sistema_id` **no quedará duplicado dentro de `configuracion`**.

## 4. Resolución automática

Regla v1:

- si el usuario selecciona sistema explícitamente → usar ese sistema;
- si no selecciona sistema pero el activo seleccionado ya tiene `sistema_id` → heredar el sistema del activo;
- si ni sistema ni activo clasificado aportan contexto → `sistema_id = NULL`.

Esto mantiene:

> sistema opcional;
> activo opcional;
> OT sin sistema válida.

## 5. Coherencia activo ↔ sistema

Si se envía simultáneamente:

- `asset_uuid` con un `sistema_id` ya registrado;
- y un sistema explícito diferente;

la RPC debe rechazar la creación por inconsistencia.

Si el activo todavía tiene `sistema_id = NULL`, se permite crear la OT con sistema explícito sin modificar automáticamente el activo.

La clasificación del activo seguirá siendo una decisión independiente.

## 6. Modelo de datos OT

Se añadirá a `ordenes_trabajo`:

```text
sistema_id uuid NULL
```

con FK compuesta:

```text
(tenant_id, instalacion_id, sistema_id)
→ sistemas_instalacion(tenant_id, instalacion_id, id)
```

No habrá backfill.

## 7. Deuda técnica controlada

### TD-OT05-001 — transporte temporal en `requirements_json`

El nombre `requirements_json` no es el lugar semántico ideal para transportar `sistema_id`.

Se acepta en OT-05 porque:

- evita romper una RPC endurecida y ya consumida;
- el sistema se almacena en columna dedicada, no dentro del JSON;
- no cambia la autoridad ni ACL;
- el bridge queda testado y documentado.

### Retirada futura

Cuando se introduzca una RPC versionada o el contrato de Platform esté listo:

- crear contrato explícito `system_uuid`;
- migrar consumidores;
- retirar el bridge `requirements_json.sistema_id`;
- conservar tests de compatibilidad durante la transición.

## 8. Tests obligatorios

OT-05 debe probar:

1. la firma pública histórica sigue existiendo;
2. sigue siendo `SECURITY INVOKER`;
3. mantiene el helper privado de numeración;
4. una OT sin sistema sigue creándose;
5. una OT con sistema válido guarda `sistema_id`;
6. sistema de otra instalación se rechaza;
7. sistema de otro tenant se rechaza;
8. activo con sistema distinto se rechaza;
9. activo con sistema y sin sistema explícito lo hereda;
10. `configuracion` no conserva `sistema_id`;
11. `anon` sigue sin ejecutar la RPC;
12. `authenticated` conserva ejecución.

## 9. Siguiente movimiento

**MOV-071B**

- añadir `ordenes_trabajo.sistema_id`;
- recrear la misma firma hardened de `create_work_order`;
- introducir resolución/validación de sistema;
- añadir pgTAP específico.

Después:

**MOV-072**

- ampliar catálogo frontend con sistemas;
- selector opcional en OT rápida y avanzada;
- tests Vitest;
- Quality.
