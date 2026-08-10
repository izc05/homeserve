# Especificación funcional — IsiVoltPro OT

## 1. Visión

**IsiVoltPro OT** es el módulo del ecosistema IsiVoltPro encargado de **crear, asignar, ejecutar, documentar, revisar y cerrar partes de trabajo**.

La OT es el registro operativo de un trabajo. No es el inventario maestro de activos ni el gestor global del mantenimiento de una instalación.

La aplicación debe funcionar tanto cuando una instalación está perfectamente documentada como cuando todavía faltan datos de sistemas o activos.

## 2. Frontera con el ecosistema IsiVoltPro

### OT es propietario de

- orden de trabajo;
- estado y ciclo de vida;
- planificación operativa;
- asignación;
- técnico responsable y colaboradores;
- visitas/intervenciones;
- checklist de ejecución;
- evidencias;
- fotografías;
- mediciones;
- materiales declarados en la OT;
- bloqueos y tiempos;
- firmas;
- revisión;
- PDF;
- eventos e histórico de la OT;
- auditoría operativa.

### OT utiliza pero no será propietario maestro de

- organizaciones;
- usuarios;
- clientes;
- instalaciones;
- ubicaciones;
- sistemas técnicos;
- activos;
- empleados/técnicos;
- artículos de almacén;
- planes de mantenimiento.

Durante la transición estos datos pueden seguir alojados en el backend actual. La arquitectura debe permitir que posteriormente procedan de **IsiVoltPro Platform** y de los módulos especializados.

### Otros módulos

- **IsiVoltPro Platform**: organización, usuarios, clientes, instalaciones, permisos y aplicaciones contratadas.
- **IsiVoltPro Activos**: identidad física/documental, activos y QR/NFC.
- **IsiVoltPro Mantenimiento**: estado técnico de instalaciones, sistemas, planes y preventivos.
- **IsiVoltPro Almacén**: stock y movimientos de material.
- **IsiVoltPro Herramientas**: herramientas, préstamos y asignaciones.
- **Apps técnicas**: inspecciones, Legionella, refrigeración/RITE, PCI y futuras especialidades.

OT se conectará mediante IDs comunes, adaptadores, deep links y eventos versionados; no mediante acceso directo a las tablas internas de otras aplicaciones.

## 3. Usuarios operativos actuales

Mientras no se complete la integración con Platform se mantienen los roles actuales por compatibilidad.

### Administrador

- gestiona configuración operativa actual;
- accede a todas las OT autorizadas;
- consulta auditoría;
- gestiona plantillas y configuración de OT.

### Coordinador

- crea OT;
- prepara requisitos y checklist;
- asigna y planifica;
- sigue estados;
- revisa evidencias;
- solicita correcciones;
- valida OT;
- genera y descarga informes.

### Técnico

- ve las OT que puede ejecutar;
- acepta una asignación;
- inicia intervención;
- completa checklist;
- registra datos técnicos;
- adjunta evidencias;
- registra materiales;
- firma;
- bloquea o reanuda;
- finaliza y envía para revisión;
- consulta su historial operativo.

### Evolución prevista

Las decisiones nuevas de interfaz y dominio se basarán progresivamente en **capabilities** en lugar de cadenas de rol hardcodeadas.

Ejemplos:

```text
work_orders.create
work_orders.assign
work_orders.execute
work_orders.review
work_orders.validate
work_orders.planning.manage
```

## 4. Contexto de una OT

Una OT puede referenciar:

- organización;
- cliente;
- instalación;
- ubicación opcional;
- sistema técnico opcional;
- activo opcional;
- trabajo origen opcional de otra app.

### Regla fundamental

**No será obligatorio tener un activo registrado para crear una OT.**

Esto permite trabajar en instalaciones antiguas o todavía no inventariadas.

Los documentos históricos conservarán snapshots de los datos necesarios para que un PDF validado no cambie si posteriormente se renombra una instalación o un activo.

## 5. Creación de OT — dos modos

### 5.1 Modo rápido

Diseñado para registrar una avería o solicitud en segundos.

Campos visibles mínimos:

- cliente/instalación;
- ubicación opcional;
- descripción o título del problema;
- prioridad.

La OT puede guardarse sin:

- activo;
- técnico;
- checklist;
- fecha planificada;
- requisitos avanzados.

Después se puede enriquecer y asignar.

### 5.2 Modo avanzado

Puede incluir:

- título;
- descripción;
- tipo;
- prioridad;
- instalación;
- ubicación;
- sistema;
- activo;
- técnico responsable;
- colaboradores;
- fecha prevista;
- fecha límite;
- duración estimada;
- instrucciones;
- riesgos o precauciones;
- resultado esperado;
- requisitos de cierre;
- checklist;
- documentación de apoyo.

Acciones:

- guardar borrador;
- preparar checklist;
- asignar;
- planificar;
- enviar;
- cancelar.

## 6. Tipos de OT

Iniciales:

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

Un tipo puede sugerir requisitos o plantilla, pero no crea estados diferentes.

La existencia del tipo `mantenimiento_preventivo` no convierte a OT en propietario del plan preventivo: **Mantenimiento decide qué trabajo debe generarse y OT lo ejecuta**.

## 7. Prioridades

- baja;
- normal;
- alta;
- urgente;
- crítica.

La prioridad afecta ordenación, alertas, planificación y representación visual, pero no concede permisos.

## 8. Estado oficial

Estados canónicos:

```text
BORRADOR
ASIGNADA
ACEPTADA
EN_CURSO
BLOQUEADA
FINALIZADA_TECNICO
VALIDADA
CANCELADA
```

Flujo principal:

```text
BORRADOR → ASIGNADA → ACEPTADA → EN_CURSO
                                  ↕
                              BLOQUEADA
                                  ↓
                         FINALIZADA_TECNICO
                           ↙             ↘
                      EN_CURSO        VALIDADA
```

`CANCELADA` se aplica solo desde transiciones autorizadas.

Los motivos de bloqueo son datos separados del estado.

## 9. Equipo de trabajo

El modelo objetivo supera la relación de un único técnico.

Una OT podrá tener:

- técnico responsable principal;
- colaboradores internos;
- técnico externo;
- empresa externa opcional.

Por compatibilidad, las OT históricas con un único `assigned_to` seguirán siendo válidas.

La ampliación se hará de forma aditiva mediante nuevas migraciones y relaciones, nunca editando migraciones aplicadas.

## 10. Visitas e intervenciones

Una OT puede requerir una o varias visitas.

Cada visita debe poder registrar:

- participante/técnico;
- fecha y hora de inicio;
- fecha y hora de fin;
- trabajo realizado;
- diagnóstico;
- pruebas;
- recomendaciones;
- trabajo pendiente;
- resultado;
- evidencias asociadas;
- relevo o próxima actuación.

Debe existir trazabilidad entre visitas y distinguir tiempo efectivo de tiempo bloqueado cuando sea posible.

## 11. Requisitos configurables de cierre

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

El servidor impide finalizar cuando falta un requisito obligatorio.

## 12. Checklist

Cada punto puede contener:

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

Tipos iniciales:

- OK / No OK / No aplica;
- texto;
- número;
- selección;
- confirmación.

El técnico responde al snapshot de la OT; no altera la definición de la plantilla original.

## 13. Ejecución técnica

### Aceptar

Confirma recepción y registra trazabilidad.

### Iniciar

Abre una visita activa. La geolocalización podrá ser configurable; no será obligatoria por defecto.

### Trabajar

El técnico puede:

- responder checklist;
- subir fotos;
- añadir observaciones;
- registrar mediciones;
- registrar material;
- documentar diagnóstico y trabajo realizado;
- guardar progreso;
- bloquear la OT.

### Bloquear

Debe registrar como mínimo:

- motivo estructurado;
- explicación.

Evolución prevista:

- responsable del desbloqueo;
- fecha estimada;
- inicio/fin de bloqueo;
- tiempo bloqueado.

No se crearán estados distintos para cada motivo.

### Reanudar

Devuelve una OT `BLOQUEADA` a `EN_CURSO` mediante transición autorizada.

### Finalizar

Antes de enviar para revisión el servidor comprueba todos los requisitos. La OT pasa a `FINALIZADA_TECNICO`.

## 14. Evidencias

Objetivo:

- fotos **Antes / Durante / Después**;
- fotos vinculadas a checklist;
- metadatos y descripción;
- compresión móvil;
- mediciones estructuradas;
- diagnóstico;
- pruebas realizadas;
- recomendaciones;
- trabajo pendiente;
- material utilizado;
- documentación adjunta.

## 15. Materiales

OT registra el material utilizado durante el trabajo.

Etapa actual/transitoria:

- descripción;
- referencia;
- cantidad;
- unidad.

Etapa integrada:

- `warehouse_item_id` opcional;
- almacén origen;
- cantidad;
- unidad;
- referencia de movimiento;
- estado de sincronización.

**OT no será propietario del stock.** IsiVoltPro Almacén confirmará los movimientos.

## 16. Revisión administrativa

El responsable comprueba:

- checklist;
- evidencias;
- tiempos;
- trabajo realizado;
- materiales;
- firmas;
- informe;
- incidencias o puntos No OK.

Puede:

- validar;
- solicitar correcciones con comentario;
- cancelar cuando la transición lo permita.

Una corrección devuelve la OT a `EN_CURSO` y conserva la trazabilidad de la revisión.

## 17. Informe PDF

Versiones:

- provisional;
- final;
- nueva versión tras correcciones cuando proceda.

Principios:

- nunca sobrescribir una versión histórica;
- almacenamiento privado;
- organización/identidad configurable;
- formato A4 profesional;
- páginas numeradas;
- pruebas con informes largos y muchas fotografías.

Contenido objetivo:

- código y versión;
- organización;
- cliente/instalación y snapshots históricos;
- ubicación y activo cuando existan;
- participantes;
- fechas, visitas y duración;
- trabajo solicitado y realizado;
- checklist;
- mediciones;
- materiales;
- fotos;
- firmas;
- resultado final;
- revisión/validación.

## 18. Panel central

Indicadores OT:

- sin asignar;
- pendientes de aceptar;
- en curso;
- bloqueadas;
- pendientes de revisión;
- vencidas;
- urgentes;
- técnicos trabajando;
- carga de trabajo.

Vistas:

- resumen;
- tablero por estado;
- tabla filtrable;
- agenda;
- planificación;
- carga por técnico;
- alertas operativas.

El panel OT no sustituye al dashboard técnico de Mantenimiento, que analizará el estado global de instalaciones y preventivos.

## 19. Zona técnico

Pantalla inicial:

- Hoy;
- Urgentes;
- Pendientes de aceptar;
- En curso;
- Bloqueadas;
- Historial reciente.

Cada tarjeta muestra contexto mínimo y una **acción principal inequívoca**:

- Aceptar;
- Iniciar;
- Continuar;
- Reanudar;
- En revisión.

## 20. Planificación

OT planifica personas y trabajos:

- técnico;
- colaboradores;
- fecha;
- hora;
- duración estimada;
- conflictos;
- disponibilidad;
- carga.

Mantenimiento seguirá siendo propietario de la planificación técnica global de planes preventivos de una instalación.

## 21. Integración con otras aplicaciones

### Entradas previstas

- crear OT desde Activos;
- crear OT desde Mantenimiento;
- crear OT desde Inspecciones;
- crear OT desde Legionella;
- crear OT desde otras apps técnicas.

### Salidas previstas

- OT creada;
- asignada;
- iniciada;
- bloqueada;
- finalizada técnicamente;
- validada;
- cancelada;
- material registrado.

Los contratos estarán versionados y deberán ser idempotentes.

## 22. QR/NFC

La identidad QR/NFC global pertenece a Activos/Platform.

Flujo objetivo:

```text
QR/NFC → Activos/Platform resuelve entidad → contexto autorizado → Crear OT
```

OT recibe IDs de instalación, ubicación o activo y abre la creación con esos datos precargados.

## 23. Notificaciones

Eventos iniciales:

- OT asignada;
- fecha modificada;
- OT urgente;
- corrección solicitada;
- OT validada;
- OT próxima a vencer.

Primera etapa: internas. Correo/push se incorporan solo después de estabilizar el flujo operativo.

## 24. Auditoría

Registrar como mínimo:

- creación;
- edición administrativa;
- asignación y reasignación;
- aceptación;
- inicio y fin de visitas;
- bloqueos;
- checklist;
- fotos;
- firmas;
- informes;
- corrección;
- validación;
- cancelación;
- reapertura;
- cambios críticos de permisos mientras permanezcan en el backend OT.

## 25. Fuera de alcance de OT

- inventario maestro de activos;
- QR/NFC global;
- planificación maestra de mantenimiento preventivo;
- stock y compras;
- herramientas y maletines;
- facturación;
- presupuestos completos;
- fichaje laboral;
- nóminas;
- chat general;
- rutas optimizadas;
- contratos comerciales complejos;
- firma electrónica cualificada;
- motores especializados de Inspecciones, Legionella, PCI o Refrigeración;
- autenticación definitiva del ecosistema;
- catálogo de suscripciones/aplicaciones.

## 26. Métricas de éxito

- una avería básica puede registrarse en segundos mediante modo rápido;
- una OT avanzada puede prepararse sin campos innecesarios;
- un técnico identifica su siguiente acción sin formación extensa;
- ninguna OT se valida con requisitos incompletos;
- el panel refleja la situación operativa con claridad;
- el PDF final conserva toda la evidencia;
- cero acceso cruzado entre técnicos/organizaciones en pruebas de seguridad;
- una OT puede originarse desde otra app y devolver el resultado sin duplicados;
- OT sigue operativa mientras Platform sustituye progresivamente los datos maestros.
