# QA y criterios de aceptación

## 1. Objetivo

No considerar terminada ninguna versión mientras existan fallos de permisos, pérdida de datos, cierre incompleto o PDF incorrecto.

## 2. Matriz principal de usuarios

Probar siempre con:

- Administrador A.
- Coordinador A.
- Técnico A1.
- Técnico A2.
- Administrador B de otra organización.
- Usuario desactivado.

## 3. Autenticación

- Login correcto.
- Login incorrecto sin filtrar información.
- Recuperación de contraseña.
- Cierre de sesión.
- Sesión expirada.
- Usuario desactivado.
- Redirección por rol.

## 4. Permisos

### Técnico

- Ve sus OT asignadas.
- No ve OT sin asignar.
- No ve OT de otro técnico.
- No accede por URL directa a OT ajena.
- No cambia técnico, prioridad, centro ni definición.
- No responde checklist antes de iniciar.
- No valida ni cancela.
- No añade archivos a OT validada.

### Coordinador

- Crea y asigna.
- Edita borrador.
- Prepara checklist.
- No rellena respuestas técnicas después del envío.
- Revisa y solicita corrección.
- Valida cuando los requisitos están completos.

### Organización

- Ningún usuario de Organización A accede a datos de B.
- Ningún UUID conocido evita RLS.

## 5. Máquina de estados

Probar todas las transiciones válidas y rechazar:

- BORRADOR → EN_CURSO.
- ASIGNADA → VALIDADA.
- Técnico → CANCELADA.
- EN_CURSO → VALIDADA.
- VALIDADA → cualquier cambio normal.
- FINALIZADA_TECNICO → edición técnica sin corrección.

Cada transición válida crea evento y auditoría.

## 6. Creación de OT

- Código automático único.
- Campos obligatorios.
- Fechas coherentes.
- Técnico activo.
- Guardado de borrador.
- Checklist preparado.
- Envío correcto.
- Doble clic no duplica.
- Error de red no crea estado ambiguo.

## 7. Ejecución

- Aceptar registra fecha.
- Iniciar crea una visita activa.
- No iniciar dos visitas activas simultáneas.
- Guardado de checklist.
- Reintento tras fallo.
- Foto asociada al punto correcto.
- Medición y unidad.
- Material con cantidad válida.
- Bloqueo exige motivo.
- Reanudar conserva historial.

## 8. Requisitos de cierre

Bloquear finalización cuando falte:

- punto obligatorio;
- foto requerida;
- medición obligatoria;
- material cuando se exige;
- firma requerida;
- prueba final;
- informe provisional.

Permitir finalización cuando todo está correcto.

## 9. Revisión

- Coordinador ve toda la evidencia.
- Los No OK quedan destacados.
- Solicitar corrección exige comentario.
- Corrección devuelve a EN_CURSO.
- Técnico ve comentario.
- Validación crea informe final.
- OT validada queda inmutable.

## 10. PDF

Casos:

- OT corta.
- Checklist de 50 puntos.
- Texto largo.
- 30 fotografías.
- Imágenes verticales y horizontales.
- Sin activo.
- Sin materiales.
- Varias visitas.
- Varias firmas.
- Caracteres españoles.
- Saltos de página correctos.
- Logo configurable.
- Páginas numeradas.
- Versión y fecha.
- Archivo guardado y descargable.
- Informe anterior no sobrescrito.

## 11. Realtime

- Asignación aparece al técnico.
- Aceptación aparece al panel.
- Inicio cambia estado.
- Bloqueo genera alerta.
- Finalización genera pendiente de revisión.
- Corrección aparece al técnico.
- Validación aparece en historial.
- Refresco manual recupera estado si Realtime falla.

## 12. Móvil

Probar Android real:

- 360 px de ancho.
- teclado no tapa botones.
- safe areas.
- cámara.
- selector de archivos.
- firma táctil.
- scroll dentro de formularios.
- botones de 44 px.
- orientación vertical.
- zoom permitido.
- conexión lenta.
- volver desde cámara sin perder datos.

## 13. Accesibilidad

- navegación con teclado en escritorio;
- foco visible;
- etiquetas de formulario;
- mensajes de error asociados;
- contraste;
- estado no solo por color;
- nombres accesibles en botones de icono;
- encabezados ordenados.

## 14. Rendimiento

Objetivos iniciales:

- dashboard usable con 1.000 OT;
- lista paginada o virtualizada;
- fotos comprimidas antes de subir;
- no descargar imágenes completas en listados;
- PDF largo sin bloquear permanentemente la interfaz;
- consultas indexadas por tenant, estado, técnico y fecha.

## 15. Criterio de release

Una release candidata exige:

- build limpio;
- typecheck limpio;
- lint limpio;
- tests unitarios;
- E2E críticos;
- pruebas RLS;
- revisión móvil;
- revisión PDF;
- migraciones documentadas;
- sin secretos;
- checklist de producción firmado.

## 16. Escenarios E2E críticos

1. Coordinador crea borrador, prepara checklist, asigna y envía.
2. Técnico acepta, inicia, completa, firma y finaliza.
3. Coordinador solicita corrección.
4. Técnico corrige y reenvía.
5. Coordinador valida.
6. PDF final se descarga.
7. Técnico distinto intenta abrir la OT y recibe denegación.
8. OT validada rechaza cualquier edición.
