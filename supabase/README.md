# Supabase

## Objetivo de la siguiente fase

Crear una única migración inicial coherente para desarrollo nuevo. No importar todas las migraciones históricas de `isivolpro-activos`.

## Orden previsto

1. extensiones y tipos;
2. perfiles;
3. organizaciones y miembros;
4. centros, ubicaciones y activos mínimos;
5. plantillas de checklist;
6. órdenes de trabajo;
7. checklist snapshot;
8. visitas, fotos, materiales y firmas;
9. informes y eventos;
10. auditoría;
11. funciones de permisos;
12. máquina de estados;
13. RLS;
14. Storage;
15. Realtime;
16. datos ficticios de desarrollo;
17. pruebas SQL.

## Reglas de migración

- Las migraciones se nombran con fecha UTC: `YYYYMMDDHHMM_descripcion.sql`.
- Una migración aplicada no se modifica.
- Cada cambio posterior crea una migración nueva.
- Toda tabla operativa activa RLS en la misma fase en que se crea.
- No dejar una ventana temporal con políticas permisivas.
- Las funciones `security definer` fijan `search_path = public` y reciben el mínimo de argumentos.
- Revocar permisos públicos que no sean necesarios.
- Comprobar índices para `tenant_id`, `assigned_to`, `status`, `planned_at`, `due_at` y claves externas.

## RPC principales

### `create_work_order`

Crea borrador y código de OT de forma transaccional.

### `assign_work_order`

Verifica técnico activo, guarda asignación, cambia estado y registra evento.

### `transition_work_order`

Controla la máquina de estados y campos temporales.

### `finalize_technician_work_order`

Comprueba checklist, fotos, firmas y requisitos antes de pasar a `FINALIZADA_TECNICO`.

### `request_work_order_correction`

Exige comentario, devuelve a `EN_CURSO` y registra evento.

### `validate_work_order`

Comprueba requisitos, genera estado final e impide modificaciones posteriores.

## Pruebas SQL

Crear pruebas para:

- técnico propio;
- técnico ajeno;
- coordinador;
- administrador;
- otra organización;
- usuario desactivado;
- OT finalizada;
- OT validada;
- archivos asociados;
- transiciones válidas e inválidas.

## Entornos

No usar producción durante desarrollo. Crear primero Supabase local o proyecto de desarrollo independiente y completar `.env.local` sin subirlo al repositorio.
