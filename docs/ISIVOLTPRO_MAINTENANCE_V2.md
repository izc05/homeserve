# IsiVoltPro Mantenimiento V2

## Visión

IsiVoltPro OT evoluciona hacia el módulo operativo de mantenimiento de IsiVoltPro.

El producto debe servir para gestionar mantenimiento correctivo, preventivo, inspecciones, revisiones, instalaciones nuevas, modificaciones, puestas en marcha y trabajos técnicos sobre instalaciones nuevas o antiguas.

La Orden de Trabajo (OT) seguirá siendo el núcleo operativo: conecta el aviso, la planificación, los técnicos, la intervención, las evidencias, el cierre, la validación y el histórico.

## Alcance de este repositorio

Este repositorio desarrolla el módulo de mantenimiento y órdenes de trabajo.

Incluye:

- clientes e instalaciones en el contexto necesario para ejecutar mantenimiento;
- ubicaciones y zonas;
- sistemas técnicos;
- activos y equipos;
- órdenes de trabajo;
- técnicos participantes;
- visitas e intervenciones;
- planificación;
- bloqueos;
- SLA y vencimientos;
- checklist;
- mediciones;
- fotografías y evidencias;
- materiales usados;
- firmas;
- informes PDF;
- mantenimiento preventivo;
- historial técnico;
- QR/NFC;
- indicadores operativos de mantenimiento.

No corresponde a este repositorio construir la capa global de IsiVoltPro Platform: autenticación común de todo el ecosistema, catálogo comercial de aplicaciones, suscripciones, facturación SaaS, portal global o permisos compartidos entre todos los módulos. Esa integración se realizará posteriormente desde IsiVoltPro Platform.

## Principio fundamental

Una OT debe poder crearse aunque la instalación todavía no esté completamente documentada.

Sistema técnico y activo pueden ser opcionales cuando la información no exista todavía.

Esto permite trabajar tanto con:

1. instalaciones nuevas perfectamente documentadas;
2. instalaciones existentes parcialmente documentadas;
3. instalaciones antiguas donde el conocimiento se construye progresivamente durante las intervenciones.

## Jerarquía funcional

Organización
→ Cliente
→ Instalación
→ Zona / ubicación
→ Sistema técnico (opcional al crear una OT)
→ Activo / equipo (opcional al crear una OT)
→ Orden de trabajo
→ Visitas / intervenciones
→ Evidencias / mediciones / materiales
→ Cierre / validación
→ Histórico

## Instalaciones nuevas

IsiVoltPro debe permitir registrar desde el inicio:

- sistemas técnicos;
- activos;
- fabricante, modelo y número de serie;
- fecha de instalación;
- empresa instaladora;
- garantía;
- documentación y manuales;
- fotografías;
- QR/NFC;
- datos técnicos;
- puesta en marcha;
- mantenimiento preventivo inicial.

La puesta en marcha debe poder generar el histórico inicial del activo y su futuro plan de mantenimiento.

## Instalaciones antiguas

Debe existir un modo progresivo de documentación.

Un técnico podrá trabajar sobre una ubicación o crear un activo provisional con información mínima, por ejemplo:

- nombre provisional;
- fotografía;
- ubicación;
- especialidad o sistema si se conoce;
- código provisional automático.

Las siguientes intervenciones podrán completar fabricante, modelo, características, documentación, relaciones técnicas y QR/NFC.

La falta de inventario previo nunca debe impedir resolver una avería.

## Tipos de trabajo

El modelo debe admitir, como mínimo:

- avería;
- correctivo;
- preventivo;
- revisión;
- inspección;
- instalación nueva;
- modificación;
- sustitución;
- medición;
- prueba funcional;
- puesta en marcha;
- emergencia;
- otro trabajo técnico.

## Creación de OT

### OT rápida

Objetivo: registrar una avería o solicitud con el mínimo número de pasos.

Datos mínimos:

- cliente;
- instalación;
- ubicación o descripción de ubicación;
- descripción del problema;
- prioridad.

Sistema, activo y técnico podrán añadirse después.

### OT avanzada

Puede incluir:

- sistema técnico;
- activo;
- especialidad;
- tipo de trabajo;
- técnico responsable;
- técnicos colaboradores;
- empresa externa;
- fecha y hora previstas;
- duración estimada;
- riesgos e instrucciones;
- checklist;
- fotografías obligatorias;
- mediciones;
- materiales;
- firmas;
- requisitos de cierre;
- informe.

## Técnicos y visitas

Una OT puede tener:

- un técnico responsable;
- uno o varios técnicos colaboradores;
- una empresa externa opcional;
- varias visitas o intervenciones.

Cada visita podrá registrar:

- participantes;
- inicio y fin;
- tiempo efectivo;
- trabajo realizado;
- fotografías;
- mediciones;
- materiales;
- observaciones;
- relevo o trabajo pendiente.

## Relevo de turno

El sistema debe permitir que un técnico deje información estructurada para la siguiente intervención:

- situación actual;
- trabajo realizado;
- pendiente;
- material solicitado;
- riesgos;
- condiciones para continuar.

## Estados de OT

Se mantendrá inicialmente la máquina de estados actual mientras se estudia su evolución:

- BORRADOR
- ASIGNADA
- ACEPTADA
- EN_CURSO
- BLOQUEADA
- FINALIZADA_TECNICO
- VALIDADA
- CANCELADA

No se crearán estados distintos para cada causa de espera.

## Bloqueos

Una OT bloqueada tendrá un motivo independiente, por ejemplo:

- material;
- acceso;
- cliente;
- autorización;
- empresa externa;
- repuesto;
- documentación;
- seguridad;
- parada de instalación;
- otro.

Debe registrarse quién o qué bloquea el trabajo, desde cuándo y, si se conoce, la fecha prevista de resolución.

El sistema deberá diferenciar tiempo total abierto, tiempo efectivo y tiempo bloqueado.

## Mantenimiento preventivo

Los planes podrán definir:

- instalación, sistema o activo;
- periodicidad;
- checklist;
- especialidad;
- duración prevista;
- requisitos de cierre;
- próxima fecha;
- responsable o grupo técnico.

Los planes podrán generar OT programadas de forma controlada.

## QR y NFC

Desde un QR/NFC de una ubicación o activo se deberá poder acceder, según permisos, a:

- ficha;
- estado;
- últimas intervenciones;
- OT abiertas;
- próximo mantenimiento;
- histórico;
- documentación;
- acción de crear OT.

Un activo no registrado deberá poder darse de alta progresivamente o permitir crear una OT sin alta previa.

## Evidencias y cierre

La OT debe admitir:

- checklist dinámicos;
- fotos antes / durante / después;
- fotos asociadas a puntos de checklist;
- mediciones estructuradas con valor y unidad;
- materiales utilizados;
- observaciones;
- defectos y recomendaciones;
- firma del técnico;
- firma de cliente o responsable cuando se requiera;
- informe provisional y final versionado;
- auditoría completa.

Una OT validada debe permanecer inmutable salvo reapertura administrativa auditada.

## Dashboard operativo

Debe priorizar acción sobre decoración.

Indicadores principales:

- OT abiertas;
- urgentes;
- vencidas;
- sin asignar;
- pendientes de aceptación;
- en curso;
- bloqueadas;
- pendientes de validación;
- preventivos próximos o vencidos;
- técnicos trabajando y disponibles.

Alertas útiles:

- OT urgente sin aceptar;
- SLA próximo a vencer;
- OT bloqueada demasiado tiempo;
- material pendiente;
- activo con averías recurrentes;
- punto de checklist NO OK;
- preventivo vencido.

## Planificación

La coordinación debe evolucionar hacia una agenda de técnicos y OT con:

- vista por día/semana;
- carga por técnico;
- disponibilidad;
- solapes;
- duración prevista;
- trabajos urgentes;
- trabajos bloqueados;
- reprogramación sencilla.

## Compatibilidad futura con IsiVoltPro Platform

Este repositorio debe evitar crear nuevas dependencias que dificulten la futura integración.

Las entidades del módulo deben poder relacionarse mediante identificadores estables como:

- organization_id;
- client_id;
- installation_id;
- location_id;
- system_id;
- asset_id;
- technician_id.

La lógica de mantenimiento debe quedar separada de la autenticación global, suscripciones y catálogo comercial del ecosistema.

## Estrategia de desarrollo

1. Trabajar siempre desde ramas creadas desde `main`.
2. Cambios pequeños y revisables.
3. No desplegar en el mini PC ni modificar producción durante el desarrollo de una fase salvo instrucción expresa.
4. Cada fase debe tener pruebas y criterios de aceptación.
5. No romper las OT existentes ni documentos históricos.
6. Mantener RLS y permisos de backend como autoridad real.
7. Priorizar primero el ciclo de mantenimiento y después las funciones comerciales o de plataforma.

## Orden inicial de evolución

1. Base de mantenimiento e instalaciones.
2. Creación rápida de OT.
3. Creación avanzada de OT.
4. Varios técnicos y visitas.
5. Relevo de turno.
6. Planificación visual.
7. Bloqueos, SLA y tiempos.
8. QR/NFC e histórico.
9. Preventivos.
10. Dashboard e indicadores.
11. Integración posterior con IsiVoltPro Platform.

## Regla de producto

IsiVoltPro debe poder empezar a gestionar una instalación desde el primer aviso y convertir progresivamente cada intervención en conocimiento técnico reutilizable.
