# IsiVoltPro OT — Plan Maestro de Ejecución

Fecha de inicio: 2026-08-10
Repositorio actual: `izc05/homeserve`
Producto objetivo: **IsiVoltPro OT**
Rama de planificación: `docs/isivoltpro-ot-execution-master`

## 1. Objetivo

Convertir el repositorio histórico `homeserve` en el módulo profesional **IsiVoltPro OT**, centrado exclusivamente en crear, asignar, ejecutar, documentar, revisar y cerrar partes de trabajo.

La integración global con usuarios, organizaciones, clientes, instalaciones, aplicaciones contratadas y permisos comunes se realizará posteriormente desde `isivoltpro-platform`. Este repositorio debe quedar preparado para integrarse sin duplicar el núcleo de Platform.

## 2. Frontera funcional obligatoria

### IsiVoltPro OT es propietario de

- órdenes de trabajo;
- estado y ciclo de vida de la OT;
- asignación operativa;
- técnico responsable y colaboradores;
- visitas/intervenciones;
- planificación del trabajo;
- checklist de ejecución;
- evidencias de la OT;
- fotografías de trabajo;
- mediciones de trabajo;
- materiales declarados/consumidos por la OT;
- bloqueos y tiempos;
- firmas;
- revisión administrativa;
- PDF de parte de trabajo;
- eventos e histórico de la OT;
- auditoría relacionada con la OT.

### IsiVoltPro OT NO será propietario de

- catálogo maestro de clientes;
- catálogo maestro de instalaciones;
- inventario técnico completo de activos;
- identificación QR/NFC global;
- planes globales de mantenimiento;
- stock y compras;
- herramientas y maletines;
- inspecciones reglamentarias completas;
- Legionella;
- refrigeración/RITE;
- facturación y presupuestos;
- autenticación global definitiva de IsiVoltPro Platform.

OT podrá consultar y referenciar esos datos mediante IDs comunes y adaptadores.

## 3. Contrato de integración que OT debe preparar

OT deberá poder trabajar con referencias externas estables:

- `organization_id`
- `client_id`
- `installation_id`
- `location_id`
- `system_id`
- `asset_id`
- `user_id`
- `employee_id`
- `maintenance_plan_id` opcional
- `source_module`
- `source_record_id`

Ninguna de estas referencias obligará a que el dato maestro sea gestionado definitivamente dentro de OT.

## 4. Regla de funcionamiento en instalaciones incompletas

Una OT debe poder crearse aunque no exista un activo inventariado.

Mínimo funcional:

1. organización/contexto;
2. cliente o referencia de cliente;
3. instalación;
4. ubicación opcional;
5. descripción del trabajo.

Sistema técnico y activo serán opcionales.

Esto permite atender instalaciones antiguas o todavía no inventariadas.

## 5. Flujo objetivo de OT

```text
AVISO / SOLICITUD
      ↓
CREAR OT
      ↓
PREPARAR / PLANIFICAR
      ↓
ASIGNAR
      ↓
ACEPTAR
      ↓
INICIAR
      ↓
VISITA / INTERVENCIÓN
      ↓
EVIDENCIAS + CHECKLIST + MEDICIONES + MATERIAL
      ↓
BLOQUEO / REANUDACIÓN cuando proceda
      ↓
CIERRE TÉCNICO
      ↓
REVISIÓN
      ↓
CORRECCIÓN o VALIDACIÓN
      ↓
PDF FINAL + HISTÓRICO + EVENTOS DE INTEGRACIÓN
```

## 6. Estrategia Git obligatoria

- `main` permanece estable.
- Una función o bloque coherente por rama.
- No desarrollar directamente sobre `main`.
- Cada rama debe partir del `main` vigente salvo que exista una dependencia documentada.
- Cada cambio funcional debe incluir pruebas.
- Cada migración aplicada es inmutable; cambios posteriores usan migración nueva.
- Toda PR debe incluir objetivo, archivos, migraciones, permisos, pruebas, pasos manuales, riesgos y rollback.
- No desplegar en mini PC hasta validar la rama/PR correspondiente.

## 7. Fases de ejecución

### OT-00 — Auditoría y definición definitiva

Objetivo: conocer exactamente qué existe y qué debemos conservar, mover, retirar o refactorizar.

Tareas:

1. revisar README y documentación;
2. revisar estructura `src`;
3. revisar `App.tsx`, `AuthApp.tsx` y `DemoApp.tsx`;
4. revisar features OT;
5. revisar features de clientes y activos actualmente embebidas;
6. revisar roles hardcodeados;
7. revisar Supabase y migraciones;
8. revisar pruebas actuales;
9. localizar restos de HomeServe;
10. localizar especialización FV no genérica;
11. localizar mantenimiento preventivo/activos que excedan el alcance OT;
12. documentar matriz KEEP / REFACTOR / MOVE / REMOVE;
13. fijar arquitectura objetivo.

Salida: auditoría firmada documentalmente, sin cambios funcionales.

### OT-01 — Identidad IsiVoltPro y limpieza de dominio

Objetivo: que el producto sea IsiVoltPro OT en código, textos, PWA, PDF y navegación.

Tareas:

1. eliminar textos HomeServe que no sean históricos controlados;
2. retirar identidad/demo de terceros del producto principal;
3. eliminar `Equipos FV` como módulo de navegación propio de OT;
4. sustituir referencias FV por activo genérico donde sean necesarias para una OT;
5. conservar compatibilidad temporal de datos si hay registros existentes;
6. revisar favicon, manifest, metadatos, títulos y PDF;
7. pruebas de marca y navegación.

### OT-02 — Modularización de la aplicación

Objetivo: reducir el acoplamiento del `App.tsx` monolítico.

Tareas:

1. separar layout y navegación;
2. separar router/páginas;
3. separar dashboard;
4. separar órdenes;
5. separar planificación;
6. separar técnicos;
7. separar informes/auditoría/configuración;
8. evitar consultas de datos dentro del layout;
9. mantener comportamiento actual mediante pruebas.

### OT-03 — Capa de contexto e integración Platform-ready

Objetivo: impedir que los componentes dependan directamente de la futura fuente maestra.

Crear contratos/adaptadores para:

- usuario activo;
- organización activa;
- capabilities;
- clientes;
- instalaciones;
- ubicaciones;
- activos;
- técnicos/empleados.

Primera implementación podrá seguir usando Supabase actual. La interfaz deberá permitir reemplazarla posteriormente por IsiVoltPro Platform.

### OT-04 — Creación rápida de OT

Objetivo: crear una avería/parte básico con el mínimo número de pasos.

Modo rápido:

1. cliente/instalación;
2. ubicación opcional;
3. descripción;
4. prioridad;
5. crear.

Después se podrá asignar o enriquecer.

Criterio: no obligar a activo, sistema técnico, checklist ni técnico en el primer guardado.

### OT-05 — Creación avanzada de OT

Añadir cuando el trabajo lo requiera:

- tipo;
- sistema;
- activo;
- instrucciones;
- riesgos;
- resultado esperado;
- fecha/hora;
- vencimiento;
- duración prevista;
- checklist;
- requisitos de cierre;
- documentación adjunta.

### OT-06 — Equipo de trabajo y múltiples visitas

Objetivo: superar el modelo de un solo `assigned_to`.

Modelo objetivo:

- responsable principal;
- colaboradores internos;
- técnico externo opcional;
- empresa externa opcional;
- varias visitas;
- registro individual de tiempos;
- relevo entre turnos;
- pendientes para siguiente visita.

Debe conservarse compatibilidad con OT antiguas de un solo técnico.

### OT-07 — Ejecución técnica móvil

Objetivo: experiencia extremadamente simple para técnico.

Pantalla principal:

- Hoy;
- Urgentes;
- Pendientes;
- En curso;
- Bloqueadas;
- Historial reciente.

Cada OT debe mostrar una acción principal inequívoca:

- Aceptar;
- Iniciar;
- Continuar;
- Reanudar;
- Enviar para revisión.

### OT-08 — Evidencias profesionales

Mejorar:

- checklist dinámico;
- fotos Antes / Durante / Después;
- foto asociada a punto de checklist;
- anotaciones/descripción;
- compresión;
- mediciones con tipo, valor y unidad;
- diagnóstico;
- trabajo realizado;
- recomendaciones;
- material utilizado;
- documentación adjunta.

### OT-09 — Bloqueos, tiempos y SLA

Bloqueo con motivo estructurado:

- material;
- acceso;
- cliente/responsable;
- autorización;
- empresa externa;
- parada de instalación;
- seguridad;
- documentación;
- otro.

Registrar:

- inicio bloqueo;
- fin bloqueo;
- responsable del desbloqueo;
- fecha prevista;
- tiempo efectivo;
- tiempo bloqueado;
- vencimiento/SLA cuando aplique.

### OT-10 — Planificación y carga de trabajo

Crear planificador operativo:

- técnicos por fila;
- día/hora;
- OT asignadas;
- duración estimada;
- disponibilidad;
- conflictos;
- carga;
- drag & drop solo cuando las reglas y pruebas estén cerradas.

### OT-11 — Cierre, revisión y PDF premium

Cierre configurable:

- checklist completo;
- evidencias obligatorias;
- trabajo realizado;
- mediciones;
- material;
- prueba funcional;
- firma técnica;
- firma responsable opcional.

Revisión:

- validar;
- devolver con corrección;
- mantener trazabilidad;
- inmutabilidad tras validación.

PDF:

- provisional;
- final;
- versionado;
- sin sobrescritura;
- imagen y textos IsiVoltPro/organización configurables;
- pruebas de informes largos.

### OT-12 — Eventos de ecosistema

Preparar eventos de integración, sin acoplar OT directamente a bases de datos de otras apps.

Entradas previstas:

- `CREATE_WORK_ORDER`
- `CREATE_WORK_ORDER_FROM_ASSET`
- `CREATE_WORK_ORDER_FROM_MAINTENANCE`
- `CREATE_WORK_ORDER_FROM_INSPECTION`
- `CREATE_WORK_ORDER_FROM_LEGIONELLA`

Salidas previstas:

- `WORK_ORDER_ASSIGNED`
- `WORK_ORDER_STARTED`
- `WORK_ORDER_BLOCKED`
- `WORK_ORDER_TECHNICALLY_FINISHED`
- `WORK_ORDER_VALIDATED`
- `WORK_ORDER_CANCELLED`
- `WORK_ORDER_MATERIAL_RECORDED`

Los payloads deberán usar IDs comunes y versión de contrato.

### OT-13 — Preparación de despliegue e integración

Antes de declarar OT lista para Platform:

- tests unitarios;
- tests integración;
- RLS;
- E2E;
- móvil;
- PDF;
- build;
- Docker;
- healthcheck;
- variables de entorno;
- backup/rollback;
- documentación de migración;
- contrato de integración estable.

## 8. Orden de prioridad funcional

P0:

- flujo OT completo;
- seguridad/RLS;
- creación rápida;
- asignación;
- ejecución móvil;
- visitas;
- evidencias;
- cierre/revisión;
- PDF.

P1:

- múltiples técnicos;
- relevo;
- planificación;
- bloqueos avanzados;
- SLA;
- eventos de ecosistema.

P2:

- offline completo;
- push;
- analítica avanzada;
- automatizaciones no esenciales.

## 9. Hallazgos iniciales confirmados el 2026-08-10

1. El paquete ya se identifica como `isivoltpro-ot`.
2. La documentación funcional define correctamente OT como núcleo de ejecución.
3. `AGENTS.md` ya limita el repositorio a órdenes de trabajo.
4. `src/App.tsx` sigue siendo muy grande y mezcla navegación, reglas y vistas.
5. La navegación aún contiene `Equipos FV`, que no corresponde al producto OT genérico.
6. Existen roles hardcodeados en frontend.
7. El modelo actual `work_orders.assigned_to` asume principalmente un técnico.
8. Ya existe `work_order_visits`, que debe reaprovecharse para múltiples intervenciones.
9. Ya existen checklist, fotos, materiales, firmas, informes y eventos de OT; se deben evolucionar, no reconstruir sin necesidad.
10. `assets` y `clients` existen dentro del frontend actual; deben evaluarse como adaptadores/contexto OT, no como futuros módulos maestros.

## 10. Política de no interferencia con IsiVoltPro Platform

Mientras Codex trabaje en `isivoltpro-platform`:

- no modificar ese repositorio desde este flujo;
- no copiar su backend dentro de OT;
- no crear un segundo núcleo definitivo de organizaciones/permisos;
- documentar cualquier necesidad de contrato para que Platform pueda implementarla;
- mantener OT operativa con su backend actual hasta que exista una migración validada.

## 11. Regla de avance

No se inicia una fase funcional hasta:

1. documentar alcance;
2. crear rama específica;
3. identificar riesgos;
4. definir pruebas;
5. realizar cambios pequeños;
6. ejecutar validaciones;
7. documentar resultado;
8. abrir/revisar PR;
9. fusionar solo si todo está correcto.

## 12. Definition of Done de IsiVoltPro OT

OT se considerará preparada para integrarse cuando:

- no dependa de identidad HomeServe;
- sea multisector y genérica;
- pueda crear OT sin activo obligatorio;
- soporte equipo de trabajo y visitas;
- tenga flujo técnico móvil completo;
- tenga evidencias y cierre robustos;
- tenga planificación operativa;
- tenga seguridad verificada;
- tenga PDF profesional;
- tenga auditoría completa;
- use contratos de contexto desacoplados;
- use IDs comunes preparados para Platform;
- exponga/consuma eventos de integración versionados;
- tenga tests y CI estables;
- tenga despliegue Docker/rollback documentado.
