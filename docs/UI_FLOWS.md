# Flujos de interfaz — IsiVoltPro OT

## 1. Principios

- La siguiente acción debe ser evidente.
- El técnico no navega por módulos maestros que no necesita.
- El coordinador detecta bloqueos, urgencias y trabajos pendientes sin abrir cada OT.
- La creación rápida no obliga a rellenar datos avanzados.
- Los formularios complejos se dividen por bloques/pasos.
- Activo y sistema técnico son opcionales para crear una OT.
- Toda acción crítica requiere respuesta visible.
- Los datos procedentes de Platform/Activos se consumen como contexto; OT no pretende ser su maestro definitivo.

## 2. Acceso

Pantallas actuales/transitorias:

- iniciar sesión;
- recuperar contraseña;
- aceptar invitación;
- cuenta desactivada;
- acceso denegado.

Destino progresivo:

- Platform proporcionará sesión, organización activa y capabilities;
- OT conservará rutas/experiencia según permisos.

Tras acceso:

- gestión/coordinación → `/dashboard`;
- ejecución técnica → `/my-work-orders`.

## 3. Panel central OT

### Cabecera

- organización activa;
- búsqueda de OT;
- alertas/notificaciones;
- usuario.

### Indicadores

- sin asignar;
- pendientes de aceptar;
- en curso;
- bloqueadas;
- pendientes de revisión;
- vencidas;
- urgentes;
- carga de técnicos.

### Bloques

- tablero por estado;
- actividad de técnicos;
- agenda/próximas OT;
- alertas;
- últimos cambios.

Acción principal: **Nueva OT**.

El panel no incluye el estado técnico global de instalaciones ni el calendario maestro de preventivos: eso corresponde a IsiVoltPro Mantenimiento.

## 4. Nueva OT — elección inicial

Al pulsar **Nueva OT**:

```text
¿Qué necesitas registrar?

[ Avería / OT rápida ]
[ OT avanzada ]
```

El usuario puede pasar del modo rápido al avanzado sin perder los datos introducidos.

## 5. OT rápida

Objetivo: registrar una solicitud en segundos.

### Contexto

- cliente/instalación;
- ubicación opcional;
- si viene desde QR/NFC, estos datos pueden llegar precargados.

### Trabajo

- descripción/título;
- prioridad.

### Acciones

- **Crear borrador**;
- **Crear y asignar** si se selecciona técnico opcional;
- **Más opciones** → cambia al modo avanzado.

No obliga a:

- activo;
- sistema técnico;
- checklist;
- técnico;
- fecha;
- requisitos avanzados.

Después de crear aparece una pantalla breve:

```text
OT creada
[código]

[ Asignar ]
[ Añadir foto ]
[ Completar datos ]
[ Abrir OT ]
```

## 6. OT avanzada

### Paso 1 — Contexto

- cliente;
- instalación;
- ubicación;
- sistema técnico opcional;
- activo opcional;
- origen de otra app si existe.

### Paso 2 — Trabajo

- título;
- descripción;
- tipo;
- prioridad;
- instrucciones;
- riesgos;
- resultado esperado.

### Paso 3 — Equipo y planificación

Primera etapa compatible:

- técnico principal;
- fecha prevista;
- fecha límite;
- tiempo estimado.

Evolución:

- colaboradores;
- externos;
- empresa externa;
- hora/duración;
- carga/conflictos.

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
- preparar snapshot;
- editar antes del envío según permisos;
- marcar obligatorios;
- exigir foto;
- ordenar.

### Paso 6 — Revisar

Acciones:

- guardar borrador;
- asignar/enviar;
- volver a editar;
- cancelar.

## 7. Creación desde otra aplicación

### Desde Activos/QR/NFC

Flujo objetivo:

```text
Escanear QR/NFC
  ↓
Activos/Platform resuelve entidad
  ↓
[ Crear OT ]
  ↓
OT recibe instalación/ubicación/activo precargados
```

El usuario completa el problema y prioridad.

### Desde Mantenimiento

Un preventivo/alerta puede abrir una OT con:

- instalación;
- sistema/activo;
- título;
- instrucciones;
- fecha límite;
- plantilla/requisitos sugeridos.

### Desde Inspecciones/Legionella/apps técnicas

Un defecto o no conformidad puede generar una OT vinculada al registro origen.

## 8. Listado administrativo

Filtros:

- texto;
- estado;
- técnico;
- prioridad;
- cliente/instalación;
- ubicación;
- tipo;
- fecha;
- vencidas;
- urgentes;
- origen cuando exista.

Columnas/tarjeta:

- código;
- título;
- responsable;
- prioridad;
- estado;
- instalación;
- fecha prevista;
- última actualización;
- siguiente acción.

En móvil administrativo se usan tarjetas, no tablas anchas obligatorias.

## 9. Detalle administrativo

### Cabecera

- código;
- estado;
- prioridad;
- cliente/instalación;
- ubicación/activo cuando existan;
- responsable/equipo;
- fechas clave.

### Secciones

1. Resumen.
2. Asignación/equipo.
3. Planificación.
4. Trabajo solicitado.
5. Checklist/progreso.
6. Visitas e intervenciones.
7. Evidencias/mediciones.
8. Materiales.
9. Firmas.
10. Informes.
11. Auditoría.
12. Revisión final.

### Acciones por estado

- `BORRADOR`: editar, preparar, asignar, cancelar.
- `ASIGNADA`: reasignar según reglas, cambiar planificación, cancelar según permisos.
- `ACEPTADA`: seguimiento; técnico debe iniciar.
- `EN_CURSO`: seguimiento; técnico ejecuta.
- `BLOQUEADA`: ver motivo, responsable y próxima acción.
- `FINALIZADA_TECNICO`: revisar, validar o solicitar corrección.
- `VALIDADA/CANCELADA`: lectura e histórico.

## 10. Planificación

Vista objetivo:

```text
              08:00    10:00    12:00
Técnico A     OT-101 ━━━━━      OT-120
Técnico B              OT-099 ━━━━━━━
Técnico C     disponible
```

Debe mostrar:

- trabajos;
- duración estimada;
- conflictos;
- urgencias;
- carga;
- disponibilidad operativa cuando sea conocida.

Una reasignación debe pasar por la regla de negocio/RPC correspondiente.

Drag & drop solo se añade cuando la transición y auditoría estén probadas.

## 11. Mis trabajos — técnico

Bloques:

- Hoy;
- Urgentes;
- Pendientes de aceptar;
- En curso;
- Bloqueadas;
- Historial reciente.

Tarjeta:

- código;
- prioridad;
- título;
- instalación/ubicación;
- fecha;
- estado;
- progreso;
- acción principal.

Acción según estado:

- `ASIGNADA` → **Aceptar**.
- `ACEPTADA` → **Iniciar**.
- `EN_CURSO` → **Continuar**.
- `BLOQUEADA` → **Revisar bloqueo / Reanudar**.
- `FINALIZADA_TECNICO` → **En revisión**.

## 12. Ejecución técnica

Cabecera compacta:

- código;
- prioridad;
- estado;
- instalación/ubicación;
- activo si existe;
- tiempo informativo;
- progreso.

Bloques/pestañas:

1. Datos.
2. Checklist.
3. Evidencias.
4. Materiales.
5. Visita/relevo.
6. Cierre.

No mostrar al técnico módulos administrativos completos de cliente, activos o mantenimiento.

## 13. Checklist móvil

Cada punto es una tarjeta con solo lo necesario:

- título;
- obligatorio;
- respuesta;
- medición si aplica;
- observación;
- fotografía si aplica;
- estado de guardado.

Campos avanzados aparecen solo cuando el punto los necesita.

## 14. Evidencias

Clasificación objetivo:

- Antes;
- Durante;
- Después;
- Checklist;
- Documento/otra evidencia.

Para cada evidencia cuando proceda:

- descripción;
- fecha;
- autor;
- visita;
- punto de checklist;
- metadatos técnicos controlados.

El móvil comprime imágenes antes de subir cuando sea seguro hacerlo.

## 15. Bloquear

Modal:

- motivo estructurado obligatorio;
- explicación obligatoria;
- responsable de desbloqueo opcional;
- fecha estimada opcional;
- material necesario opcional.

La OT pasa a `BLOQUEADA`, no a un estado diferente por cada causa.

## 16. Relevo / nueva visita

Cuando un trabajo continúa posteriormente:

- resumen de lo realizado;
- qué queda pendiente;
- riesgos/precauciones;
- material pendiente;
- próxima acción;
- responsable sugerido;
- nueva visita cuando corresponda.

El relevo queda dentro del histórico de la OT.

## 17. Cierre técnico

Pantalla de requisitos:

```text
Checklist             ✓
Fotos finales          ✓
Mediciones             ✓
Material               ✓
Firma técnico          ✓
Prueba funcional       ✓
Informe                pendiente
```

Estados visuales:

- completado;
- pendiente;
- bloqueante.

Botón **Enviar para revisión** solo puede completar la operación cuando el backend confirma todos los requisitos.

## 18. Revisión administrativa

Vista de comprobación:

- contexto;
- participantes/visitas;
- tiempos;
- checklist;
- No OK;
- evidencias;
- mediciones;
- materiales;
- firmas;
- informe.

Acciones:

- **Validar OT**;
- **Solicitar correcciones**.

Corrección exige comentario y devuelve la OT al flujo autorizado `EN_CURSO` con trazabilidad.

## 19. Validación e integración

Tras validar:

- OT queda inmutable salvo mecanismo administrativo explícito/auditado;
- PDF final queda versionado;
- se publica/planifica `WORK_ORDER_VALIDATED`;
- Activos/Mantenimiento pueden incorporar el resultado a su histórico;
- Almacén puede conciliar materiales referenciados;
- el módulo origen puede cerrar su incidencia/no conformidad.

## 20. Técnicos

Durante transición la pantalla actual sigue disponible para operación.

Cada tarjeta puede mostrar:

- nombre;
- especialidad;
- cuenta;
- estado operativo;
- OT activa;
- pendientes;
- urgentes;
- última actividad.

La fuente maestra futura de personas/miembros será Platform.

No llamar “en vivo” a un técnico si solo conocemos número de OT. La presencia debe basarse en señales reales.

## 21. Informes

Filtros:

- fecha;
- técnico;
- instalación;
- tipo;
- estado;
- prioridad.

Acciones:

- abrir OT;
- descargar PDF;
- ver versiones;
- exportación futura de listado.

## 22. Configuración OT

Debe limitarse progresivamente a parámetros propios del módulo:

- identidad documental/configuración de OT;
- requisitos por tipo;
- plantillas de checklist OT;
- numeración cuando el contrato lo permita;
- preferencias de ejecución;
- retención específica;
- notificaciones OT.

Los CRUD maestros de organización, clientes, instalaciones, usuarios y activos migrarán a Platform/Activos cuando exista reemplazo validado.

## 23. Estados de interfaz obligatorios

Toda pantalla con datos debe contemplar:

- cargando;
- vacío;
- error;
- sin permiso;
- sin conexión;
- guardando;
- guardado;
- cambios pendientes;
- sincronización pendiente;
- solo lectura.

## 24. Regla de UX de integración

Una integración nunca debe obligar al usuario a volver a introducir datos ya conocidos.

Ejemplo:

```text
Activo ACT-541
  ↓ Crear OT
OT recibe automáticamente:
- organización
- cliente
- instalación
- ubicación
- activo
```

El usuario solo completa los datos propios del trabajo.
