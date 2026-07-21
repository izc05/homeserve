# Provisión segura de la demostración

Este runbook prepara datos completamente ficticios para **HomeServe
Operaciones**. Se aplica solo a un proyecto nuevo, aislado y marcado como demo.
No autoriza crear el proyecto, enlazar el repositorio, aplicar migraciones ni
publicar GitHub Pages.

## 1. Verificación obligatoria del destino

Antes de ejecutar cualquier instrucción SQL en Cloud:

1. Abrir el proyecto desde Supabase Dashboard y comprobar visualmente su
   **nombre** y su **Project ref**. No continuar si no coinciden con el proyecto
   demo aprobado para la presentación.
2. Confirmar que el entorno está identificado de forma inequívoca como
   **demostración** y no contiene datos operativos.
3. Abrir **Settings → Data API** y verificar que `private` no aparece en
   **Exposed schemas**. Solo deben exponerse los esquemas aprobados para la API.
4. Confirmar que existe un backup recuperable o un punto de restauración
   apropiado para el plan del proyecto.
5. Verificar que las 20 migraciones del repositorio ya están aplicadas y que la
   última es `20260721174937_harden_function_execute_privileges.sql`.
6. Comprobar que el árbol y el commit que contienen este runbook son los
   aprobados para la demo.

Si falla una sola comprobación, no crear usuarios y no abrir el SQL Editor para
ejecutar el seed.

## 2. Crear manualmente los usuarios Auth

En **Authentication → Users**, usar **Add user** para crear exactamente:

```text
admin.demo@example.test
tecnico.demo@example.test
```

Para cada cuenta:

1. La contraseña la elige y conserva la persona responsable de la demo. Nunca
   se copia a Git, documentación, mensajes, capturas ni variables del frontend.
2. Completar el flujo de confirmación de correo o marcar el correo como
   confirmado mediante la función administrativa del Dashboard.
3. Comprobar que el listado muestra una sola cuenta por correo y que ambas
   están confirmadas.

No introducir roles en `raw_user_meta_data`: la autorización procede de
`tenant_members`, que crea el seed después de validar las cuentas.

## 3. Ejecutar explícitamente el seed

Repetir la verificación de nombre y Project ref de la sección 1. Después:

1. Abrir **SQL Editor** con el proyecto demo seleccionado.
2. Copiar íntegramente
   [`../supabase/demo/seed_demo.sql`](../supabase/demo/seed_demo.sql).
3. Revisar que el editor apunta al proyecto demo y ejecutar el bloque una sola
   vez.
4. Conservar únicamente el resultado de éxito o el mensaje de error; no copiar
   cabeceras, cookies ni credenciales.

El bloque se detiene y revierte si falta una cuenta, hay correos duplicados, el
correo no está confirmado, el esquema no coincide o existen datos ajenos al
tenant reservado. La segunda ejecución previa a la presentación es segura y
debe mantener los mismos conteos. Después de ejecutar acciones en vivo, no se
debe relanzar: los eventos reales adicionales harán que el seed detenga la
operación para no ocultarlos ni borrarlos.

## 4. Verificar los datos

Tras confirmar nuevamente el proyecto de destino, ejecutar en SQL Editor estas
consultas de solo lectura:

```sql
select id, nombre, slug, estado
from public.tenants
where id = 'd3e00000-0000-4000-8000-000000000001';

select role, estado, especialidad, count(*)
from public.tenant_members
where tenant_id = 'd3e00000-0000-4000-8000-000000000001'
group by role, estado, especialidad
order by role;

select codigo_ot, titulo, prioridad, estado, assigned_to, fecha_prevista
from public.ordenes_trabajo
where tenant_id = 'd3e00000-0000-4000-8000-000000000001'
order by codigo_ot;

select entity_id, action, user_id, metadata, created_at
from public.audit_logs
where tenant_id = 'd3e00000-0000-4000-8000-000000000001'
order by created_at, id;
```

El resultado esperado es:

| Entidad | Conteo |
| --- | ---: |
| Tenant | 1 |
| Membresías | 2 |
| Cliente | 1 |
| Instalación | 1 |
| OT | 3 |
| Visita activa | 1 |
| Auditoría | 7 |
| Equipos | 0 |

Las OT deben ser `OT-2026-00001` en `BORRADOR`, `OT-2026-00002` en
`ASIGNADA` y `OT-2026-00003` en `EN_CURSO`. La última debe mostrar, en orden,
`create_work_order`, `assign_work_order`, `accept_work_order` y
`start_work_order_visit`.

## 5. Verificar los accesos

Usar una sesión privada distinta para cada perfil:

1. Entrar como `admin.demo@example.test` y confirmar:
   - organización **HomeServe Demo Madrid**;
   - cliente **Cliente Demo Madrid**;
   - instalación **Vivienda Demo Madrid**;
   - tres OT visibles y siete eventos de auditoría.
2. Cerrar esa sesión privada.
3. Entrar como `tecnico.demo@example.test` y confirmar:
   - solo aparecen `OT-2026-00002` y `OT-2026-00003`;
   - el borrador `OT-2026-00001` no es visible;
   - no existe acceso a la auditoría administrativa.

No compartir las contraseñas durante estas comprobaciones.

## 6. Secuencia recomendada de presentación

1. Como administrador, mostrar KPIs, cliente e instalación.
2. Abrir `OT-2026-00001` para enseñar un borrador sin asignación ficticia.
3. Abrir `OT-2026-00003` y recorrer su historial completo en `EN_CURSO`.
4. Cambiar a la sesión técnica y abrir `OT-2026-00002`.
5. Aceptar la OT y, si forma parte de la demostración autorizada, iniciar la
   intervención con los controles reales.
6. Volver al administrador y comprobar el estado y los nuevos eventos reales.

No usar fotos, checklist, finalización, datos personales ni instalaciones
reales durante la presentación.

## 7. Rollback limitado al tenant demo

Primero detener la presentación y cerrar las sesiones de navegador. Repetir
todas las comprobaciones de destino de la sección 1. El siguiente bloque solo
es válido si la identidad reservada sigue perteneciendo a **HomeServe Demo
Madrid**:

```sql
do $rollback_demo$
declare
  demo_tenant_id constant uuid := 'd3e00000-0000-4000-8000-000000000001';
begin
  if not exists (
    select 1
    from public.tenants
    where id = demo_tenant_id
      and nombre = 'HomeServe Demo Madrid'
      and slug = 'homeserve-demo-madrid'
  ) then
    raise exception 'Rollback detenido: la identidad del tenant demo no coincide';
  end if;

  delete from public.audit_logs where tenant_id = demo_tenant_id;
  delete from public.historial_mantenimiento where tenant_id = demo_tenant_id;
  delete from public.mantenimientos_programados where tenant_id = demo_tenant_id;
  delete from public.planes_mantenimiento where tenant_id = demo_tenant_id;
  delete from public.ot_revisiones_admin where tenant_id = demo_tenant_id;
  delete from public.ot_informes where tenant_id = demo_tenant_id;
  delete from public.ot_firmas where tenant_id = demo_tenant_id;
  delete from public.ot_visita_materiales where tenant_id = demo_tenant_id;
  delete from public.ot_fotos where tenant_id = demo_tenant_id;
  delete from public.ot_checklist_respuestas where tenant_id = demo_tenant_id;
  delete from public.ot_visitas where tenant_id = demo_tenant_id;
  delete from public.ordenes_trabajo where tenant_id = demo_tenant_id;
  delete from public.activos where tenant_id = demo_tenant_id;
  delete from public.ubicaciones where tenant_id = demo_tenant_id;
  delete from public.instalaciones where tenant_id = demo_tenant_id;
  delete from public.tenant_invitations where tenant_id = demo_tenant_id;
  delete from public.tenant_members where tenant_id = demo_tenant_id;
  delete from public.clientes where tenant_id = demo_tenant_id;
  delete from public.tenants
  where id = demo_tenant_id
    and nombre = 'HomeServe Demo Madrid'
    and slug = 'homeserve-demo-madrid';
end;
$rollback_demo$;
```

Después del rollback SQL:

1. En **Authentication → Users**, abrir cada cuenta demo y revocar todas sus
   sesiones activas con la acción administrativa del Dashboard.
2. Confirmar que ya no hay sesiones activas.
3. Eliminar `admin.demo@example.test` y `tecnico.demo@example.test` desde Auth
   Admin. La eliminación de Auth retirará sus perfiles mediante la relación
   existente.
4. Ejecutar de nuevo las consultas de verificación: el tenant reservado y sus
   registros deben tener conteo cero.

No eliminar usuarios antes de revocar sesiones: un JWT emitido puede continuar
siendo válido hasta su expiración aunque la cuenta ya no aparezca en Auth.

## 8. Recuperación

Si el seed falla, no intentar limpiar por correo parcial ni ejecutar `TRUNCATE`,
`DROP` o borrados generales. Guardar el mensaje de error, verificar el destino
y corregir únicamente la precondición indicada. Si la presentación modifica
las OT, usar primero el rollback completo y después volver a provisionar.
