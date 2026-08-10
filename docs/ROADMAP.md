# Roadmap de ejecución — IsiVoltPro OT

Este roadmap sustituye el enfoque histórico de construcción inicial y refleja la evolución del repositorio actual hacia un módulo OT maduro y preparado para integrarse con IsiVoltPro Platform.

## Regla general

Cada fase sigue el mismo ciclo:

```text
alcance
  ↓
rama
  ↓
cambios pequeños
  ↓
pruebas
  ↓
registro de movimientos
  ↓
PR
  ↓
revisión
  ↓
merge
```

No se modifica producción/mini PC hasta validar la fase correspondiente.

## OT-00 — Auditoría y definición definitiva

### Objetivo

Separar correctamente responsabilidades de OT, Mantenimiento, Activos y Platform antes de seguir ampliando código.

### Trabajo

- auditar documentación;
- auditar frontend;
- auditar dominio OT;
- auditar migraciones/RPC/RLS;
- clasificar KEEP / REFACTOR / BRIDGE / MOVE / REMOVE;
- fijar contrato de integración;
- actualizar especificación, arquitectura y UI;
- registrar todos los movimientos.

### Salida

PR exclusivamente documental con alcance definitivo de IsiVoltPro OT.

---

## OT-01 — Identidad IsiVoltPro y limpieza de dominio

### Objetivo

Eliminar del producto OT cualquier identidad o módulo visible que no corresponda al objetivo definitivo.

### Trabajo

- retirar navegación `Equipos FV`;
- sustituir enfoque FV por referencia genérica a activo;
- revisar textos/branding legacy;
- aislar demos;
- conservar compatibilidad histórica de datos;
- no eliminar tablas/migraciones aplicadas.

### Salida

IsiVoltPro OT genérico y multisector sin romper el flujo actual.

---

## OT-02 — Modularización del frontend

### Objetivo

Reducir el acoplamiento del `App.tsx` actual sin reescritura total.

### Trabajo

- extraer layout/navegación;
- extraer páginas;
- separar dashboard;
- separar órdenes;
- separar planificación;
- separar módulos administrativos;
- mantener tests de regresión.

### Salida

Frontend más mantenible y preparado para adapters.

---

## OT-03 — Contexto y adapters Platform-ready

### Objetivo

Separar componentes OT de los datos maestros actuales.

### Trabajo

- `PlatformSessionContext`;
- mapa role → capability;
- `ClientDirectory`;
- `InstallationDirectory`;
- `AssetDirectory`;
- `TechnicianDirectory`;
- implementación Supabase actual;
- contratos para futura implementación Platform.

### Salida

OT sigue funcionando igual pero la fuente de datos puede sustituirse progresivamente.

---

## OT-04 — Creación rápida

### Objetivo

Registrar una avería/solicitud con el mínimo esfuerzo.

### Datos visibles mínimos

- instalación/contexto;
- ubicación opcional;
- descripción/título;
- prioridad.

### Reglas

- activo opcional;
- técnico opcional;
- checklist opcional al primer guardado;
- valores por defecto controlados;
- posterior enriquecimiento.

### Salida

Una incidencia básica se crea en segundos.

---

## OT-05 — Creación avanzada

### Objetivo

Cubrir trabajos planificados o complejos sin saturar el modo rápido.

### Trabajo

- tipo;
- sistema/activo opcional;
- instrucciones;
- riesgos;
- resultado esperado;
- fecha/hora;
- vencimiento;
- duración estimada;
- checklist;
- requisitos de cierre;
- documentación de apoyo.

### Salida

OT avanzada completamente configurable.

---

## OT-06 — Equipo de trabajo, visitas y relevo

### Objetivo

Superar el modelo de un solo técnico.

### Trabajo

- responsable principal;
- colaboradores;
- externos;
- empresa externa opcional;
- múltiples visitas;
- tiempo por visita;
- relevo;
- trabajo pendiente;
- compatibilidad con `assigned_to` histórico.

### Salida

Una OT admite trabajos reales de varias personas y varios días.

---

## OT-07 — Ejecución móvil del técnico

### Objetivo

Que el técnico identifique inmediatamente qué debe hacer.

### Inicio

- Hoy;
- Urgentes;
- Pendientes;
- En curso;
- Bloqueadas;
- Historial reciente.

### Acción principal

- Aceptar;
- Iniciar;
- Continuar;
- Reanudar;
- Enviar para revisión.

### Salida

Flujo móvil simple, rápido y probado en Android.

---

## OT-08 — Evidencias profesionales

### Objetivo

Documentar el trabajo con calidad suficiente para histórico técnico y PDF.

### Trabajo

- checklist dinámico;
- fotos Antes/Durante/Después;
- fotos por punto;
- compresión;
- mediciones estructuradas;
- diagnóstico;
- pruebas;
- recomendaciones;
- materiales;
- archivos adjuntos.

### Salida

Evidencia completa y consistente.

---

## OT-09 — Bloqueos, tiempos y SLA

### Objetivo

Diferenciar trabajo efectivo de espera y controlar vencimientos.

### Trabajo

- motivo estructurado;
- explicación;
- responsable de resolución;
- fecha prevista;
- inicio/fin de bloqueo;
- tiempo bloqueado;
- tiempo efectivo;
- SLA/vencimiento;
- alertas.

### Salida

Tiempos y bloqueos auditables sin multiplicar estados.

---

## OT-10 — Planificación y carga

### Objetivo

Gestionar personas y trabajos desde un planificador operativo.

### Trabajo

- técnico por fila;
- calendario/día/hora;
- duración estimada;
- conflictos;
- disponibilidad;
- carga;
- reasignación controlada;
- drag & drop solo después de cerrar reglas y tests.

### Salida

Coordinación visual de la carga OT.

---

## OT-11 — Cierre, revisión y PDF premium

### Objetivo

Cerrar una OT con garantías técnicas, administrativas y documentales.

### Trabajo

- requisitos obligatorios;
- firma;
- prueba funcional;
- cierre técnico;
- revisión;
- corrección;
- validación;
- inmutabilidad;
- PDF provisional/final/versionado;
- pruebas de volumen.

### Salida

Parte de trabajo profesional y trazable.

---

## OT-12 — Eventos del ecosistema

### Objetivo

Conectar OT con otros módulos sin acoplar bases de datos.

### Entradas

- Activos;
- Mantenimiento;
- Inspecciones;
- Legionella;
- Refrigeración y otras apps.

### Salidas

- creada;
- asignada;
- iniciada;
- bloqueada;
- finalizada técnicamente;
- validada;
- cancelada;
- material registrado.

### Reglas

- `event_version`;
- IDs comunes;
- idempotencia;
- seguridad;
- auditabilidad.

### Salida

Contrato estable v1 preparado para Platform.

---

## OT-13 — Integración y despliegue listo para piloto

### Objetivo

Declarar OT preparada para formar parte del ecosistema unificado.

### Validaciones

- typecheck;
- lint;
- unit tests;
- SQL/RLS;
- E2E;
- móvil;
- PDF;
- build;
- Docker;
- healthcheck;
- variables de entorno;
- backup;
- rollback;
- staging;
- documentación de migración;
- integración mínima con Activos y Mantenimiento.

### Salida

IsiVoltPro OT lista para piloto e integración progresiva con Platform.

---

## Priorización

### P0

- seguridad/RLS;
- ciclo OT;
- creación rápida/avanzada;
- asignación;
- visitas;
- zona técnico;
- checklist/evidencias;
- cierre/revisión;
- PDF.

### P1

- múltiples técnicos;
- relevo;
- bloqueos avanzados;
- SLA;
- planificación;
- adapters/capabilities;
- eventos de ecosistema.

### P2

- push/correo;
- offline completo;
- analítica avanzada;
- automatizaciones no esenciales;
- APK si aporta valor sobre PWA estable.

## Dependencias con otros repositorios

OT no debe esperar a que Platform esté terminada para mejorar su dominio.

Sin embargo:

- no duplicará el nuevo núcleo de Platform;
- no ampliará Activos como módulo maestro;
- no ampliará planes globales de Mantenimiento;
- no gestionará stock de Almacén;
- documentará cualquier contrato que necesite de otros módulos.

## Regla de avance

No iniciar una fase posterior si la anterior tiene:

- fallos de permisos;
- pérdida de datos;
- transición inconsistente;
- tests críticos fallidos;
- deuda de migración no documentada;
- alcance ambiguo con otro módulo.
