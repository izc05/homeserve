# Seguridad

## Objetivo

Evitar acceso cruzado entre organizaciones y técnicos, proteger evidencias y garantizar la integridad de las OT.

## Amenazas principales

- técnico accediendo a una OT ajena por URL;
- modificación directa mediante consola o API;
- cambio de `tenant_id` o `assigned_to` desde cliente;
- subida de archivos maliciosos;
- exposición de fotos, firmas o PDF;
- cambio de estado inválido;
- edición de una OT validada;
- pérdida de trazabilidad;
- credenciales incluidas en el repositorio.

## Controles obligatorios

### Autenticación

- Supabase Auth.
- Sesiones gestionadas por SDK oficial.
- Verificación de correo configurable.
- Recuperación de contraseña mediante flujo oficial.
- No guardar contraseñas propias.

### Autorización

- RLS en todas las tablas operativas.
- Funciones `security definer` pequeñas, revisadas y con `search_path` fijo.
- Triggers para integridad y transiciones.
- Roles de base de datos mínimos.
- El frontend oculta acciones, pero RLS decide realmente.

### Aislamiento por organización

Toda consulta y política debe verificar membresía activa en el `tenant_id` correspondiente.

### Aislamiento técnico

Un técnico solo accede a OT asignadas a su usuario. Las pruebas deben intentar acceso por UUID conocido y llamadas directas a Supabase.

### Archivos

- buckets privados;
- MIME permitido por tipo;
- tamaño máximo configurable;
- nombres generados por servidor o cliente seguro;
- rutas con tenant y OT;
- URLs firmadas cortas;
- eliminación prohibida tras validación salvo proceso administrativo.

### Integridad de OT

- transiciones mediante RPC;
- comprobación de requisitos antes de finalizar;
- inmutabilidad tras validar o cancelar;
- reasignación auditada;
- corrección con motivo obligatorio.

### Auditoría

Registrar actor, acción, entidad, fecha y metadatos mínimos. No guardar secretos ni contenido completo de firmas en logs.

## Variables de entorno

Frontend permitido:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nunca en frontend:

- service role;
- claves privadas;
- secretos de correo;
- secretos de firma;
- tokens administrativos.

## Protección de datos

- recoger solo datos necesarios;
- permitir desactivar usuarios sin borrar historial;
- no mostrar identificadores personales en listados innecesarios;
- definir retención de archivos antes de producción;
- documentar exportación y eliminación cuando aplique.

## Pruebas de seguridad mínimas

1. Técnico A no lee OT de Técnico B.
2. Técnico A no modifica OT de Técnico B.
3. Técnico no cambia prioridad ni asignación.
4. Coordinador no responde checklist técnico después del envío.
5. OT validada no admite nuevos registros hijos.
6. URL de archivo expira.
7. Usuario desactivado pierde acceso.
8. Miembro de otra organización no accede por UUID.
9. No puede finalizarse con requisitos incompletos.
10. No existen secretos en historial Git.

## Revisión antes de producción

- ejecutar pruebas RLS en SQL;
- revisar políticas tabla por tabla;
- comprobar buckets;
- rotar claves si se expusieron durante desarrollo;
- revisar usuarios y datos demo;
- configurar cabeceras de seguridad;
- limitar orígenes de Edge Functions;
- validar recuperación de cuenta;
- documentar copias de seguridad.
