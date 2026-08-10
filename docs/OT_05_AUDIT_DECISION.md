# IsiVoltPro OT — OT-05 · Decisión de auditoría para Sistema técnico v1

Fecha: 2026-08-10
Rama: `feat/ot-technical-system-v1`
Base: `49f918b19600477ca837620f068281cc2c9458db`
Estado: **DECISIÓN CERRADA PARA OT-05B**

## 1. Pregunta de diseño

¿IsiVoltPro OT necesita ya un modelo completo de especialidades, técnicos, normativa, sistemas, activos y checklists, o basta una entidad mínima de sistema técnico dentro de cada instalación?

## 2. Respuesta

Para OT-05 v1 se adopta una entidad **mínima, tenant-safe, opcional y evolutiva**.

No se copia la arquitectura masiva de la PR #31.

## 3. Entidad aprobada

Nombre de tabla:

`public.sistemas_instalacion`

### Columnas aprobadas

```sql
id uuid primary key

tenant_id uuid not null
instalacion_id uuid not null

nombre text not null
codigo text null
especialidad text not null default 'general'
descripcion text null

criticidad text not null default 'media'
estado text not null default 'activo'

created_by uuid null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz null
```

### Checks aprobados

`nombre`:

- trim entre 2 y 180 caracteres.

`especialidad`:

- texto normalizado no vacío;
- v1 no usa FK a catálogo global.

`criticidad`:

- `baja`;
- `media`;
- `alta`;
- `critica`.

`estado`:

- `activo`;
- `fuera_servicio`;
- `inactivo`.

## 4. Relaciones aprobadas

### Tenant

FK:

`tenant_id → tenants(id)`

### Instalación

FK compuesta:

`(tenant_id, instalacion_id) → instalaciones(tenant_id, id)`

Esto impide vincular un sistema con una instalación de otro tenant.

### Created by

`created_by → profiles(id)`

No se hace obligatorio para no bloquear compatibilidad/importaciones futuras.

## 5. Índices aprobados

### Identidad tenant-safe

```text
UNIQUE (tenant_id, id)
```

### Código opcional único dentro de instalación

Índice único parcial:

```text
(tenant_id, instalacion_id, lower(codigo))
WHERE codigo IS NOT NULL AND deleted_at IS NULL
```

Consecuencias:

- varios sistemas pueden tener `codigo = NULL`;
- no se repite un código activo dentro de la misma instalación;
- un código de un registro soft-deleted puede reutilizarse.

### Consulta principal

Índice:

```text
(tenant_id, instalacion_id, estado)
WHERE deleted_at IS NULL
```

## 6. RLS aprobada

RLS habilitado desde la migración.

### SELECT

```sql
public.has_tenant_access(tenant_id)
```

### INSERT / UPDATE

```sql
public.can_manage_work_orders(tenant_id)
```

### DELETE físico

La aplicación v1 **no tendrá función de borrado físico**.

Aunque la política SQL pudiera permitir gestión, el repository frontend no expondrá `.delete()`.

La baja funcional será:

- `estado = 'inactivo'`; o
- `deleted_at` solo si en una fase posterior se define una acción explícita de archivo.

OT-05C inicial usará principalmente `estado`.

## 7. Trigger

Usar el trigger existente:

`public.set_updated_at()`

sobre `updated_at`.

No crear una función duplicada.

## 8. Especialidad v1

Se aprueba `especialidad text`, no tabla global.

Motivo:

- permite empezar con categorías comunes;
- no bloquea clientes con terminología propia;
- evita meter 21 especialidades globales antes de validar el producto;
- permite normalizar más adelante mediante migración aditiva.

### Valores UI iniciales recomendados

No son constraints SQL rígidos:

- `general`;
- `electricidad_bt`;
- `climatizacion`;
- `refrigeracion`;
- `fontaneria`;
- `acs_legionella`;
- `pci`;
- `gases_medicinales`;
- `telecomunicaciones`;
- `automatizacion_control`;
- `obra_civil`;
- `otra`.

La DB acepta texto válido para no cerrar la evolución.

## 9. No backfill

No se crea ningún sistema automáticamente para instalaciones existentes.

No se crea `GENERAL` por defecto.

No se actualizan activos.

No se actualizan OT.

No se actualizan checklists.

## 10. Regla de opcionalidad

La introducción de `sistemas_instalacion` no cambia todavía ningún formulario de OT.

En fases posteriores:

- `activos.sistema_id` será nullable;
- `ordenes_trabajo.sistema_id` será nullable.

Una OT rápida seguirá siendo válida sin sistema y sin activo.

## 11. Capability UI aprobada

Nueva capability futura:

`installations.systems.manage`

Mapa:

- `admin_cliente` ✅
- `coordinador` ✅
- `tecnico` ❌
- `tecnico_externo` ❌
- `cliente_lectura` ❌
- desconocido ❌

No se añade todavía en este documento; se implementará en MOV-064 después de validar SQL.

## 12. Tests SQL requeridos antes de UI

La subfase OT-05B no se considera válida sin comprobar:

1. tabla existe;
2. RLS activado;
3. admin/coordinador pueden gestionar;
4. técnico/lectura no pueden gestionar;
5. miembro tenant puede leer según `has_tenant_access`;
6. tenant B no lee tenant A;
7. FK impide instalación de otro tenant;
8. criticidad inválida falla;
9. estado inválido falla;
10. nombre demasiado corto falla;
11. código duplicado activo en misma instalación falla;
12. mismo código en instalaciones distintas es válido;
13. `codigo NULL` múltiple es válido.

## 13. Rollback técnico previsto

Mientras la tabla no tenga referencias desde activos/OT:

```sql
DROP TABLE IF EXISTS public.sistemas_instalacion;
```

será suficiente para revertir OT-05B en un entorno de desarrollo.

No se ejecutará rollback ni migración en producción durante esta fase sin autorización explícita.

## 14. Decisión final

**APROBADO PARA IMPLEMENTAR OT-05B** con una única migración aditiva y tests SQL específicos.

No se permite ampliar el alcance de esa migración a:

- activos;
- órdenes de trabajo;
- técnicos;
- checklists;
- especialidades globales;
- normativa;
- backfills.
