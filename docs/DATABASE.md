# Modelo de datos

## 1. Principios

- Todas las entidades de negocio pertenecen a una organización mediante `tenant_id`.
- Los identificadores son UUID.
- Las fechas se guardan con zona horaria.
- RLS está activado en toda tabla con datos operativos.
- El frontend no envía un `tenant_id` arbitrario sin validación.
- Las OT validadas o canceladas son inmutables.

## 2. Tablas iniciales

### `profiles`

Perfil asociado a `auth.users`.

Campos:

- `id uuid primary key references auth.users`
- `display_name text`
- `email text`
- `phone text null`
- `avatar_path text null`
- `last_seen_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `tenants`

- `id uuid`
- `name text`
- `legal_name text null`
- `logo_path text null`
- `timezone text default 'Europe/Madrid'`
- `is_active boolean`
- `created_at`
- `updated_at`

### `tenant_members`

- `id uuid`
- `tenant_id uuid`
- `user_id uuid`
- `role enum: administrator | coordinator | technician`
- `status enum: invited | active | disabled`
- `employee_code text null`
- `specialty text null`
- `created_at`
- `updated_at`

Restricción única: `(tenant_id, user_id)`.

### `sites`

Centros o instalaciones.

- `id uuid`
- `tenant_id uuid`
- `name text`
- `code text null`
- `address text null`
- `contact_name text null`
- `contact_phone text null`
- `is_active boolean`
- trazabilidad

### `locations`

- `id uuid`
- `tenant_id uuid`
- `site_id uuid`
- `name text`
- `code text null`
- `description text null`
- `is_active boolean`
- trazabilidad

### `assets`

Activo opcional relacionado con la OT.

- `id uuid`
- `tenant_id uuid`
- `site_id uuid`
- `location_id uuid null`
- `name text`
- `code text null`
- `category text null`
- `brand text null`
- `model text null`
- `serial_number text null`
- `qr_token uuid null`
- `is_active boolean`
- trazabilidad

### `checklist_templates`

- `id uuid`
- `tenant_id uuid`
- `name text`
- `work_order_type text null`
- `version integer`
- `is_active boolean`
- trazabilidad

### `checklist_template_items`

- `id uuid`
- `tenant_id uuid`
- `template_id uuid`
- `position integer`
- `title text`
- `description text null`
- `response_type text`
- `is_required boolean`
- `requires_photo boolean`
- `unit text null`
- `min_value numeric null`
- `max_value numeric null`
- `options jsonb null`
- trazabilidad

### `work_orders`

- `id uuid`
- `tenant_id uuid`
- `code text`
- `title text`
- `description text null`
- `work_order_type text`
- `priority text`
- `status text`
- `site_id uuid`
- `location_id uuid null`
- `asset_id uuid null`
- `assigned_to uuid null`
- `created_by uuid`
- `planned_at timestamptz null`
- `due_at timestamptz null`
- `estimated_minutes integer null`
- `instructions text null`
- `safety_notes text null`
- `expected_result text null`
- `requirements jsonb`
- `block_reason text null`
- `block_notes text null`
- `accepted_at timestamptz null`
- `started_at timestamptz null`
- `technician_finished_at timestamptz null`
- `validated_at timestamptz null`
- `validated_by uuid null`
- `review_status text`
- `review_notes text null`
- `cancelled_at timestamptz null`
- `cancelled_by uuid null`
- `cancellation_reason text null`
- `created_at`
- `updated_at`
- `deleted_at timestamptz null`

Restricciones:

- código único por organización;
- técnico asignado debe ser miembro técnico activo;
- estado dentro de la lista oficial;
- transiciones controladas por función o trigger.

### `work_order_checklist_items`

Snapshot inmutable de la definición preparada para una OT.

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `template_item_id uuid null`
- `position integer`
- `title text`
- `description text null`
- `response_type text`
- `is_required boolean`
- `requires_photo boolean`
- `unit text null`
- `min_value numeric null`
- `max_value numeric null`
- `options jsonb null`
- `result text default 'PENDING'`
- `text_value text null`
- `numeric_value numeric null`
- `selected_value text null`
- `observation text null`
- `action_taken text null`
- `defect text null`
- `recommendation text null`
- `answered_by uuid null`
- `answered_at timestamptz null`
- trazabilidad

El coordinador puede editar la definición solo mientras la OT está en `BORRADOR`. El técnico solo puede editar campos de respuesta durante ejecución.

### `work_order_visits`

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `technician_id uuid`
- `status text`
- `started_at timestamptz`
- `ended_at timestamptz null`
- `start_latitude numeric null`
- `start_longitude numeric null`
- `work_performed text null`
- `diagnosis text null`
- `pending_work text null`
- `final_result text null`
- `effective_minutes integer null`
- trazabilidad

Solo una visita activa por OT y técnico salvo decisión posterior.

### `work_order_photos`

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `visit_id uuid null`
- `checklist_item_id uuid null`
- `photo_type text`
- `bucket text`
- `path text`
- `caption text null`
- `taken_at timestamptz null`
- `created_by uuid`
- `created_at`

### `work_order_materials`

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `visit_id uuid null`
- `description text`
- `reference text null`
- `quantity numeric`
- `unit text`
- `notes text null`
- trazabilidad

### `work_order_signatures`

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `visit_id uuid null`
- `signature_type text: technician | responsible`
- `signer_name text`
- `signer_reference text null`
- `bucket text`
- `path text`
- `signed_at timestamptz`
- `created_by uuid`

### `work_order_reports`

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `version integer`
- `report_type text: provisional | final | correction`
- `bucket text`
- `path text`
- `filename text`
- `sha256 text null`
- `generated_by uuid`
- `generated_at timestamptz`
- `metadata jsonb`

Restricción única: `(work_order_id, version)`.

### `work_order_events`

Historial funcional de estados.

- `id uuid`
- `tenant_id uuid`
- `work_order_id uuid`
- `event_type text`
- `from_status text null`
- `to_status text null`
- `notes text null`
- `metadata jsonb`
- `created_by uuid`
- `created_at`

### `audit_logs`

- `id uuid`
- `tenant_id uuid null`
- `actor_id uuid null`
- `action text`
- `entity_type text`
- `entity_id uuid null`
- `before_data jsonb null`
- `after_data jsonb null`
- `metadata jsonb null`
- `created_at`

## 3. Funciones previstas

- `current_user_has_role(tenant_id, roles[])`
- `can_manage_work_orders(tenant_id)`
- `can_execute_work_order(work_order_id)`
- `transition_work_order(work_order_id, target_status, payload)`
- `validate_work_order_requirements(work_order_id)`
- `next_work_order_code(tenant_id)`
- `touch_updated_at()`

Las transiciones críticas deben realizarse mediante RPC transaccional, no con actualizaciones parciales desde varias pantallas.

## 4. RLS resumido

### Administrador y coordinador

Pueden leer todas las OT de su organización. Pueden crear, asignar y gestionar según rol.

### Técnico

Puede leer una OT solo cuando:

```sql
assigned_to = auth.uid()
and exists (
  select 1 from tenant_members
  where tenant_id = work_orders.tenant_id
    and user_id = auth.uid()
    and role = 'technician'
    and status = 'active'
)
```

Para escribir registros hijos, además la OT debe estar en estado ejecutable.

## 5. Inmutabilidad

Cuando una OT está `VALIDADA` o `CANCELADA`:

- no se modifica la OT;
- no se añaden ni cambian checklist, visitas, fotos, materiales, firmas o PDF;
- solo se permite lectura;
- cualquier reapertura futura requiere función administrativa, motivo y auditoría.

## 6. Seeds

Solo datos ficticios claramente identificados. Nunca incluir correos, teléfonos, firmas, imágenes o información real.
