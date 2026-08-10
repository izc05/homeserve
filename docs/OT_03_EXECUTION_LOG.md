# IsiVoltPro OT — OT-03 · Creación rápida de órdenes de trabajo

Fecha de inicio: 2026-08-10
Rama: `feat/ot-quick-create`
Base exacta: `main` @ `b2856aa069d51f8b2149b708570692846dfce103`
Estado: **EN CURSO**

## 1. Objetivo

Permitir registrar una avería/OT en pocos segundos sin obligar al coordinador a completar el formulario técnico completo.

Principio principal:

> Nunca exigir que un activo esté registrado para poder abrir una OT.

La OT rápida debe reutilizar la misma RPC `create_work_order`; no se crea una segunda vía de persistencia.

## 2. Flujo objetivo v0.1

Campos principales:

1. Cliente — obligatorio para filtrar contexto.
2. Instalación — obligatoria porque la RPC actual la requiere.
3. Ubicación — opcional.
4. Activo relacionado — opcional.
5. Problema / título — obligatorio.
6. Prioridad — obligatoria, por defecto `normal`.
7. Descripción adicional — opcional.

Acción principal:

**Crear OT rápida** → crea un **BORRADOR** sin técnico ni planificación.

Después, desde la ficha de OT, el responsable puede:

- asignar técnico;
- vincular/enriquecer activo;
- añadir planificación;
- preparar checklist;
- añadir instrucciones, riesgos y requisitos especiales.

## 3. Auditoría del flujo actual — MOV-057

### Esquema actual

`createWorkOrderSchema` obliga:

- título;
- cliente;
- instalación.

Ya permite vacíos en:

- ubicación;
- activo;
- técnico;
- planificación;
- descripción técnica adicional.

Conclusión:

**No hay dependencia técnica que obligue a registrar un activo.**

### API/RPC actual

`CreateWorkOrderInput` ya acepta:

- `locationId: null`;
- `assetId: null`;
- `technicianId: null`.

`createWorkOrder()` utiliza exclusivamente:

`supabase.rpc('create_work_order', ...)`.

La nueva UI rápida reutilizará exactamente esta ruta.

### Tests existentes

`workOrderCommands.test.ts` ya contiene un input base con:

- `assetId: null`;
- `technicianId: null`;
- `plannedAt: null`;
- `dueAt: null`.

Por tanto existe una base de regresión para crear borradores sin activo/técnico.

### Problema UX actual

`CreateWorkOrderForm.tsx` tiene aproximadamente 24 KB y antes de los campos de trabajo muestra:

- alta rápida de instalación FV;
- alta de equipo;
- detalles GPS/mapa/foto;
- después trabajo y ubicación;
- después planificación/asignación;
- después requisitos de cierre.

Esto es válido como formulario avanzado, pero no como registro de avería inmediato.

Además quedan textos sectoriales FV visibles en el formulario real, que deberán neutralizarse dentro de OT-03 sin cambiar datos ni IDs.

## 4. Requisitos de cierre para OT rápida

La auditoría de `WorkOrderCompletionPanel` y `evaluateCompletionRequirements` confirma que los requisitos marcados como obligatorios bloquean el cierre si faltan.

Firma de técnico e informe pueden aparecer como no disponibles en la versión actual.

Por tanto la OT rápida no debe heredar requisitos que puedan hacer imposible el cierre.

### Requisitos rápidos v0.1

- checklist: `false`;
- fotos iniciales: `false`;
- **foto final: `true`**;
- mediciones: `false`;
- materiales: `false`;
- firma técnico: `false`;
- firma responsable: `false`;
- prueba funcional: `false`;
- informe: `false`;
- revisión administrativa: `true`.

Motivo:

- mantiene una evidencia final mínima disponible hoy;
- evita exigir funciones aún no disponibles;
- conserva el paso de revisión administrativa después del trabajo.

Estos requisitos son solo el preset de **OT rápida**. El modo avanzado conserva su configuración completa.

## 5. Arquitectura propuesta

### `QuickCreateWorkOrderForm`

Nuevo componente dedicado a la entrada rápida.

No crea:

- clientes;
- instalaciones;
- activos;
- técnicos;
- planes preventivos.

Solo consume el catálogo existente y crea la OT mediante `create_work_order`.

### `WorkOrderCreateWorkspace`

Contenedor de dos modos:

- **Rápida** — por defecto al pulsar `Nueva OT`;
- **Avanzada** — reutiliza `CreateWorkOrderForm` actual.

Cuando la creación llega precargada desde otro módulo, el workspace arrancará en Avanzada para no perder contexto legacy.

### Compatibilidad

No se elimina `CreateWorkOrderForm`.

No se cambia:

- RPC;
- esquema SQL;
- RLS;
- estados;
- catálogo;
- datos reales.

## 6. Movimientos OT-03

### MOV-056 — Crear rama

**COMPLETADO.**

`feat/ot-quick-create` desde `main` `b2856aa069d51f8b2149b708570692846dfce103`.

### MOV-057 — Auditar flujo existente

**COMPLETADO.**

Resultado: backend reutilizable; cuello de botella = UI.

### MOV-058 — Definir contrato rápido puro

Crear:

- schema de formulario rápido;
- mapper `QuickFormValues → CreateWorkOrderInput`;
- preset de requisitos rápidos.

### MOV-059 — Tests del contrato

Probar:

- cliente/instalación obligatorios;
- ubicación opcional;
- activo opcional;
- técnico siempre `null`;
- tipo siempre `averia`;
- planificación `null`;
- preset de cierre seguro;
- prioridad conservada;
- rol/backend no se alteran.

### MOV-060 — Crear `QuickCreateWorkOrderForm`

UI móvil y compacta con:

- cliente;
- instalación;
- ubicación opcional;
- activo opcional;
- problema;
- prioridad;
- descripción opcional;
- botón `Crear OT rápida`.

### MOV-061 — Crear `WorkOrderCreateWorkspace`

Selector:

- Rápida;
- Avanzada.

Regla inicial:

- `Nueva OT` sin contexto → Rápida;
- alta iniciada desde cliente/activo/técnico/OT relacionada → Avanzada.

### MOV-062 — Integrar en `App.tsx`

Sustituir únicamente el render directo de `CreateWorkOrderForm` por el workspace.

Capability requerida sigue siendo:

`work_orders.create`.

### MOV-063 — Neutralizar textos FV del formulario avanzado

Cambiar solo lenguaje visible/datos por defecto genéricos:

- instalación general;
- activo/equipo general;
- ejemplos multisector.

No renombrar tablas, IDs ni columnas.

### MOV-064 — Tests UI/regresión

Probar:

- modo rápido por defecto;
- modo avanzado accesible;
- activo no obligatorio;
- borrador sin técnico;
- contexto precargado conserva modo avanzado;
- no reaparecen cadenas FV visibles en creación.

### MOV-065 — Revisión global de diff

Confirmar ausencia de:

- SQL;
- migraciones;
- RLS;
- RPC;
- Storage;
- workflows;
- infraestructura;
- producción;
- Platform.

### MOV-066 — PR OT-03 Draft

Abrir con contrato, screenshots/estructura si procede, tests y rollback.

### MOV-067 — CI

Quality:

- branding;
- typecheck;
- lint;
- tests;
- build.

### MOV-068 — Revisión final / Ready

Mismo HEAD + CI verde + diff exacto.

### MOV-069 — Squash & Merge OT-03

Solo tras validación.

### MOV-070 — Preparar OT-04

Fase prevista: contexto técnico de instalación/sistemas o siguiente bloque de mantenimiento priorizado tras revisar el estado real de `main`.

## 7. Criterios de aceptación OT-03

1. `Nueva OT` abre por defecto un formulario corto.
2. No pide activo obligatorio.
3. No pide técnico obligatorio.
4. No pide fechas obligatorias.
5. Crea mediante la RPC existente.
6. Queda como borrador.
7. La ficha creada puede continuar el flujo normal.
8. El modo avanzado sigue disponible.
9. Los accesos precargados existentes no se rompen.
10. La creación real no muestra branding FV heredado.
11. No hay cambios de DB/RLS/RPC.
12. CI final verde antes de merge.
