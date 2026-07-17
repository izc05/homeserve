# Creación y asignación de órdenes de trabajo

## Objetivo

Activar la primera operación de escritura de IsiVoltPro OT sin alterar los datos heredados ni rebajar las políticas RLS existentes.

## Migración

Archivo:

`supabase/migrations/202607171430_create_assign_work_orders_rpc.sql`

La migración es aditiva y crea:

- `public.work_order_code_seq` para códigos `OT-AAAA-NNNNNN`;
- `public.create_work_order(...)`;
- `public.assign_work_order(...)`.

No modifica tablas, roles, estados, constraints ni registros existentes.

## Seguridad

Las dos RPC usan `SECURITY INVOKER` y por tanto mantienen las RLS del usuario que llama.

Además:

- requieren sesión autenticada;
- validan `can_manage_work_orders(tenant_id)`;
- no pueden ejecutarse con el rol `anon`;
- solo se conceden a `authenticated`;
- instalación, ubicación y activo deben pertenecer a la organización activa;
- el técnico debe ser miembro activo con rol `tecnico` o `tecnico_externo`;
- la reasignación solo se permite antes de que la OT sea aceptada;
- toda creación, asignación y reasignación queda registrada en `audit_logs`.

## Comportamiento

### Guardar borrador

`create_work_order` recibe `technician_uuid = null` y crea la OT en estado heredado `BORRADOR`.

### Crear y asignar

Cuando recibe un técnico válido, crea la OT directamente en `ASIGNADA`, registra quién la asignó y guarda la fecha de asignación.

### Reasignar

`assign_work_order` admite OT en `BORRADOR`, `NUEVA` o `ASIGNADA`. No permite reasignar una OT que ya haya sido aceptada o iniciada.

## Interfaz

El formulario se encuentra en:

`src/features/work-orders/components/CreateWorkOrderForm.tsx`

Carga mediante RLS:

- instalaciones;
- ubicaciones;
- activos;
- técnicos activos.

Permite:

- guardar borrador;
- crear y asignar;
- configurar requisitos de checklist, fotos, mediciones, materiales, firmas, prueba funcional, informe y revisión administrativa.

Los usuarios sin rol `admin_cliente` mantienen acceso de solo lectura. El rol `coordinador` todavía no se activa en la base heredada porque requiere una migración y aprobación separadas.

## Validación antes de producción

1. Crear una rama de desarrollo de Supabase.
2. Aplicar la migración en esa rama.
3. Ejecutar `supabase/tests/create_assign_work_orders_contract.sql`.
4. Probar con administrador, técnico propio, técnico ajeno y otra organización.
5. Confirmar que un técnico no puede crear ni asignar OT.
6. Confirmar que no se puede asignar a un miembro inactivo o de solo lectura.
7. Generar tipos TypeScript.
8. Ejecutar advisors de seguridad y rendimiento.
9. Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.

## Despliegue

No fusionar ni aplicar esta migración en el proyecto principal hasta completar las pruebas anteriores en una rama de Supabase.

El coste consultado para una rama de desarrollo es de **0,01344 USD por hora**. Su creación requiere confirmación expresa de Isicio.
