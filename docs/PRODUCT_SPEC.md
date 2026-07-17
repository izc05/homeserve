# Especificación funcional — IsiVoltPro OT

## 1. Visión

Aplicación para que un panel central cree y supervise órdenes de trabajo y para que los técnicos ejecuten únicamente las que les han sido asignadas.

## 2. Usuarios

### Administrador

- configura organización;
- crea y desactiva usuarios;
- asigna roles;
- accede a todas las OT;
- consulta auditoría;
- gestiona plantillas y configuración.

### Coordinador

- crea OT;
- prepara checklist;
- asigna técnico;
- planifica fechas;
- sigue estados;
- revisa evidencias;
- solicita correcciones;
- valida OT;
- genera y descarga informes.

### Técnico

- ve sus OT;
- acepta una asignación;
- inicia la intervención;
- completa checklist;
- registra datos técnicos;
- adjunta fotos;
- registra materiales;
- firma;
- bloquea o reanuda;
- finaliza y envía para revisión;
- consulta su historial.

## 3. Entidades auxiliares

La aplicación necesita datos mínimos de:

- organizaciones;
- miembros;
- técnicos;
- centros o instalaciones;
- ubicaciones;
- activos opcionales;
- plantillas de checklist;
- órdenes de trabajo.

No se desarrollará un inventario completo. Los materiales de una OT podrán registrarse como texto, referencia, cantidad y unidad.

## 4. Creación de OT

Campos mínimos:

- código automático;
- título;
- descripción del trabajo;
- tipo;
- prioridad;
- centro o instalación;
- ubicación opcional;
- activo opcional;
- técnico asignado;
- fecha prevista;
- fecha límite opcional;
- duración estimada;
- instrucciones;
- riesgos o precauciones;
- resultado esperado;
- requisitos de cierre;
- checklist.

Acciones:

- guardar borrador;
- preparar checklist;
- asignar y enviar;
- cancelar.

## 5. Tipos de OT iniciales

- avería;
- mantenimiento preventivo;
- mantenimiento correctivo;
- revisión;
- inspección;
- instalación;
- sustitución;
- medición;
- urgencia;
- otro.

Los tipos pueden sugerir requisitos y plantilla, pero no deben crear estados distintos.

## 6. Prioridades

- baja;
- normal;
- alta;
- urgente;
- crítica.

La prioridad afecta ordenación, alertas y color, pero no permisos.

## 7. Requisitos configurables

Una OT puede exigir:

- checklist completo;
- fotos iniciales;
- fotos finales;
- foto en puntos concretos;
- mediciones;
- registro de materiales;
- firma del técnico;
- firma del responsable;
- prueba funcional final;
- informe PDF;
- revisión administrativa.

El sistema impide finalizar cuando falta un requisito obligatorio.

## 8. Checklist

Cada punto contiene:

- orden;
- título o descripción;
- obligatorio;
- tipo de respuesta;
- requiere foto;
- unidad opcional;
- límites opcionales;
- resultado;
- observación;
- medición;
- acción realizada;
- defecto;
- recomendación.

Tipos de respuesta iniciales:

- OK / No OK / No aplica;
- texto;
- número;
- selección;
- confirmación.

El coordinador define los puntos antes del envío. El técnico responde, pero no modifica la definición.

## 9. Ejecución técnica

### Aceptar

Confirma recepción. Registra fecha y usuario.

### Iniciar

Crea una intervención activa con hora de inicio. La geolocalización será configurable, no obligatoria por defecto.

### Trabajar

El técnico puede:

- responder checklist;
- subir fotos;
- añadir observaciones;
- registrar mediciones;
- registrar material;
- guardar borrador operativo;
- bloquear la OT.

### Bloquear

Debe indicar motivo y explicación. El tiempo bloqueado se separa del tiempo efectivo cuando sea posible.

### Finalizar

Antes de enviar para revisión, el sistema comprueba todos los requisitos. La OT pasa a `FINALIZADA_TECNICO`.

## 10. Revisión administrativa

El responsable ve una lista de comprobación:

- checklist completo;
- fotos obligatorias;
- tiempos;
- trabajo realizado;
- materiales;
- firmas;
- PDF provisional;
- incidencias o puntos No OK.

Puede:

- validar;
- solicitar correcciones con comentario;
- cancelar con motivo.

Una corrección devuelve la OT a `EN_CURSO` y notifica al técnico.

## 11. Informe PDF

Versiones:

- provisional al finalizar el técnico;
- final al validar;
- nueva versión tras correcciones.

Contenido:

- logo configurable propio;
- código y versión;
- datos generales;
- técnico y responsable;
- fechas y duración;
- ubicación y activo;
- trabajo solicitado y realizado;
- checklist;
- mediciones;
- materiales;
- fotos;
- firmas;
- resultado final;
- validación;
- páginas numeradas.

## 12. Panel central

Indicadores principales:

- OT sin asignar;
- asignadas pendientes de aceptar;
- en curso;
- bloqueadas;
- finalizadas pendientes de revisar;
- vencidas;
- urgentes;
- técnicos trabajando;
- técnicos sin actividad reciente.

Vistas:

- resumen;
- tablero por estado;
- tabla filtrable;
- agenda;
- carga por técnico;
- alertas.

## 13. Zona técnico

Pantalla inicial:

- trabajos de hoy;
- urgentes;
- pendientes de aceptar;
- en curso;
- bloqueadas;
- finalizadas recientes.

Cada tarjeta muestra código, título, prioridad, fecha, ubicación, estado y acción siguiente.

## 14. Notificaciones

Eventos iniciales:

- OT asignada;
- fecha modificada;
- OT urgente;
- corrección solicitada;
- OT validada;
- OT próxima a vencer.

Primera versión: notificaciones internas. Correo o push se añaden después de validar el flujo.

## 15. Auditoría

Registrar:

- creación;
- edición administrativa;
- asignación y reasignación;
- aceptación;
- inicio y fin;
- bloqueos;
- checklist;
- fotos;
- firmas;
- PDF;
- corrección;
- validación;
- cancelación;
- reapertura;
- cambios de usuario y rol.

## 16. Fuera de alcance inicial

- facturación;
- presupuestos completos;
- stock y compras;
- fichaje laboral;
- nóminas;
- mensajería tipo chat;
- rutas optimizadas;
- mantenimiento OCA;
- contratos y clientes comerciales complejos;
- firma electrónica cualificada;
- IA generativa dentro del producto.

## 17. Métricas de éxito

- una OT puede crearse y enviarse en menos de 2 minutos;
- un técnico identifica su siguiente acción sin formación extensa;
- ninguna OT se valida con requisitos incompletos;
- el panel refleja cambios en segundos;
- el PDF final contiene toda la evidencia;
- cero acceso cruzado entre técnicos en pruebas de seguridad.
