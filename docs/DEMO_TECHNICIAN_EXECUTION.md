# Ejecución técnica en modo demo

Este incremento amplía exclusivamente `demo.html` y no realiza llamadas a Supabase.

## Flujo disponible

1. Acceder con el perfil Técnico.
2. Abrir una OT asignada.
3. Entrar en la pestaña **Ejecución**.
4. Iniciar o pausar el cronómetro.
5. Registrar materiales y mediciones.
6. Completar checklist y fotos finales.
7. Añadir observaciones y firma del técnico.
8. Finalizar la intervención para dejarla pendiente de validación.
9. Acceder como Administrador o Coordinador para firmar y validar.

## Persistencia

El almacenamiento local pasa a la versión 2. Las sesiones antiguas de la versión 1 se migran automáticamente conservando órdenes, tareas, fotografías, documentos e historial.

## Seguridad

- No usa credenciales.
- No escribe en Supabase.
- No modifica datos reales.
- Las firmas son simulaciones sin validez electrónica.
