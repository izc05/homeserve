# Flujos de interfaz

## 1. Principios

- La siguiente acción debe ser evidente.
- El técnico no navega por módulos administrativos.
- El coordinador debe detectar bloqueos y trabajos pendientes sin abrir cada OT.
- Formularios largos se dividen por pasos.
- Toda acción crítica requiere confirmación y respuesta visible.

## 2. Acceso

Pantallas:

- iniciar sesión;
- recuperar contraseña;
- aceptar invitación;
- cuenta desactivada;
- acceso denegado.

Tras iniciar sesión:

- administrador/coordinador → `/dashboard`;
- técnico → `/my-work-orders`.

## 3. Panel central

### Cabecera

- organización activa;
- búsqueda global de OT;
- notificaciones;
- usuario.

### Indicadores

- sin asignar;
- pendientes de aceptar;
- en curso;
- bloqueadas;
- pendientes de revisión;
- vencidas;
- urgentes.

### Bloques

- tablero por estado;
- técnicos y actividad actual;
- próximas fechas;
- alertas;
- últimos cambios.

Acción principal fija: **Nueva OT**.

## 4. Crear OT

### Paso 1 — Destino

- centro;
- ubicación;
- activo opcional.

### Paso 2 — Trabajo

- título;
- descripción;
- tipo;
- prioridad;
- instrucciones;
- riesgos;
- resultado esperado.

### Paso 3 — Planificación

- técnico;
- fecha prevista;
- fecha límite;
- tiempo estimado.

### Paso 4 — Requisitos

- checklist;
- fotos;
- mediciones;
- materiales;
- firmas;
- prueba final;
- informe;
- revisión.

### Paso 5 — Checklist

- seleccionar plantilla;
- editar puntos;
- añadir o quitar;
- marcar obligatorios;
- exigir foto;
- ordenar.

### Paso 6 — Revisar y enviar

Resumen completo. Acciones:

- guardar borrador;
- enviar al técnico;
- volver a editar;
- cancelar.

## 5. Listado administrativo de OT

Filtros:

- texto;
- estado;
- técnico;
- prioridad;
- centro;
- fecha;
- vencidas;
- urgentes.

Columnas:

- código;
- título;
- técnico;
- prioridad;
- estado;
- fecha prevista;
- última actualización;
- acción.

En móvil administrativo, usar tarjetas en lugar de tabla ancha.

## 6. Detalle administrativo

Secciones:

1. Resumen y estado.
2. Asignación y planificación.
3. Trabajo solicitado.
4. Checklist y progreso.
5. Intervenciones y tiempos.
6. Fotos y mediciones.
7. Materiales.
8. Firmas.
9. Informes.
10. Auditoría de la OT.
11. Revisión final.

Acciones por estado:

- BORRADOR: editar, preparar, asignar, cancelar.
- ASIGNADA: reasignar, cambiar fecha, cancelar.
- EN_CURSO/BLOQUEADA: consultar y contactar.
- FINALIZADA_TECNICO: validar o solicitar corrección.
- VALIDADA/CANCELADA: lectura y descarga.

## 7. Mis trabajos — técnico

Bloques rápidos:

- Hoy.
- Urgentes.
- Pendientes de aceptar.
- En curso.
- Bloqueadas.

Tarjeta:

- código;
- prioridad;
- título;
- centro y ubicación;
- fecha;
- estado;
- progreso;
- botón de siguiente acción.

Siguiente acción según estado:

- ASIGNADA → Aceptar.
- ACEPTADA → Iniciar.
- EN_CURSO → Continuar.
- BLOQUEADA → Revisar bloqueo / Reanudar.
- FINALIZADA_TECNICO → En revisión.

## 8. Ejecución técnica

Cabecera compacta:

- código;
- estado;
- prioridad;
- ubicación;
- cronómetro informativo;
- progreso.

Pestañas o pasos:

1. Datos.
2. Checklist.
3. Evidencias.
4. Materiales.
5. Cierre.

### Checklist móvil

Cada punto es una tarjeta:

- título;
- obligatorio;
- respuesta grande;
- medición si aplica;
- observación;
- foto;
- estado guardado.

No mostrar todos los campos avanzados si no aplican.

### Bloquear

Modal:

- motivo obligatorio;
- explicación obligatoria;
- material necesario opcional;
- fecha estimada opcional.

### Cierre técnico

Resumen de requisitos:

- completado;
- pendiente;
- bloqueante.

Botón **Enviar para revisión** solo activo cuando no hay bloqueantes.

## 9. Revisión administrativa

Vista de comprobación:

- datos principales;
- tiempo;
- checklist;
- No OK;
- fotos faltantes;
- materiales;
- firmas;
- PDF provisional.

Acciones:

- Validar OT.
- Solicitar correcciones.

Correcciones exige comentario. El técnico ve el comentario destacado al reabrir.

## 10. Técnicos

Cada tarjeta muestra:

- nombre;
- especialidad;
- estado de cuenta;
- estado operativo;
- OT activa;
- pendientes;
- urgentes;
- última actividad.

No llamar “en vivo” a un técnico si solo se conoce el número de OT. La presencia se basa en visita activa y `last_seen_at`.

## 11. Informes

Filtros por fecha, técnico, centro, tipo, estado y prioridad.

Acciones:

- abrir OT;
- descargar último PDF;
- ver versiones;
- exportación futura de listado.

## 12. Configuración

- identidad y logo propio;
- datos de organización;
- centros;
- ubicaciones;
- activos opcionales;
- usuarios;
- plantillas;
- requisitos por tipo;
- numeración de OT;
- retención y preferencias.

## 13. Estados de interfaz obligatorios

Toda pantalla con datos debe contemplar:

- cargando;
- vacío;
- error;
- sin permiso;
- sin conexión;
- guardando;
- guardado;
- cambios pendientes;
- solo lectura.
