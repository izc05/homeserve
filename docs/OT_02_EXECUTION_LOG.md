# IsiVoltPro OT — OT-02 · Capabilities y desacoplamiento de roles

Fecha de inicio: 2026-08-10
Rama: `refactor/ot-capabilities-access`
Base exacta: `main` @ `c0612148cae177ce426fab13bcb9cbf80fa5fcc7`
Estado: **EN CURSO**

## 1. Objetivo

Desacoplar progresivamente la interfaz de IsiVoltPro OT de decisiones directas basadas en nombres de rol (`admin_cliente`, `coordinador`, `tecnico`, etc.) mediante una capa de **capabilities**, sin cambiar todavía la autoridad real de Supabase/RLS.

OT-02 debe ser una refactorización de compatibilidad: mismo usuario + mismo rol actual = mismas acciones permitidas que antes.

## 2. Principio de seguridad

La capa frontend de capabilities **no concede seguridad real**.

La autoridad continúa en:

- PostgreSQL;
- RLS;
- RPC/funciones;
- validaciones de servidor.

La UI solo decide qué mostrar/habilitar para mejorar arquitectura y preparar la futura integración con IsiVoltPro Platform.

## 3. Restricciones de OT-02

1. No modificar producción ni mini PC.
2. No desplegar durante la fase.
3. No modificar `isivoltpro-platform`.
4. No modificar tablas ni datos.
5. No modificar RLS.
6. No modificar RPC ni funciones SQL.
7. No modificar migraciones aplicadas.
8. No cambiar el significado de ningún rol actual durante la primera subfase.
9. Cada capability debe tener prueba explícita.
10. Cada migración de un check de rol debe mantener paridad de comportamiento.
11. PR separada + CI verde + revisión de diff antes de merge.

## 4. Roles actuales a preservar

Compatibilidad inicial conocida:

- `admin_cliente`;
- `coordinador`;
- `tecnico`;
- `tecnico_externo`;
- `cliente_lectura`.

No se renombran ni eliminan todavía.

## 5. Capabilities OT v0.1 previstas

### Órdenes de trabajo

- `work_orders.read`;
- `work_orders.create`;
- `work_orders.assign`;
- `work_orders.execute`;
- `work_orders.review`;
- `work_orders.validate`;
- `work_orders.cancel`;
- `work_orders.audit.read`.

### Planificación

- `planning.read`;
- `planning.manage`.

### Técnicos

- `technicians.read`;
- `technicians.manage`;
- `technicians.invite`.

### Clientes / instalaciones

- `clients.read`;
- `clients.manage`.

### Configuración OT

- `work_order_templates.read`;
- `work_order_templates.manage`.

### Informes

- `reports.read`.

La lista podrá reducirse si la auditoría demuestra que alguna capability no es necesaria todavía. No se añadirán permisos comerciales/globales de Platform en esta fase.

## 6. Mapa de compatibilidad esperado

### `admin_cliente`

Debe mantener acceso de gestión completo de OT dentro del alcance actual.

### `coordinador`

Debe mantener creación, asignación, planificación, revisión/validación y administración operativa actualmente permitidas.

### `tecnico`

Debe mantener ejecución de sus OT y zona técnica, sin administración global.

### `tecnico_externo`

Debe conservar la semántica técnica externa existente; no se amplían privilegios.

### `cliente_lectura`

Debe mantener solo consulta donde el producto actual ya la permita; no se habilitan acciones de gestión.

## 7. Movimientos OT-02

### MOV-040 — Crear rama OT-02

**Estado:** COMPLETADO.

- rama `refactor/ot-capabilities-access`;
- creada desde `main` `c0612148cae177ce426fab13bcb9cbf80fa5fcc7`;
- sin arrastrar ramas previas.

### MOV-041 — Crear bitácora OT-02

**Estado:** COMPLETADO con este archivo.

### MOV-042 — Auditoría exhaustiva de checks por rol

Revisar directamente:

- `src/App.tsx`;
- `src/AuthApp.tsx`;
- `src/features/technicians/technicianAccess.ts`;
- `src/features/clients/clientAccess.ts`;
- componentes que reciban `viewerRole`;
- helpers y tests de acceso;
- navegación y acciones críticas.

Salida:

- inventario `archivo → check actual → comportamiento → capability destino`.

No se editará código funcional hasta cerrar este inventario.

### MOV-043 — Definir contrato de capabilities

Crear módulo pequeño, previsto inicialmente como:

`src/auth/capabilities.ts`

Debe incluir:

- tipo `OtCapability`;
- roles legacy conocidos;
- mapa role → capabilities;
- `hasCapability(role, capability)`;
- helpers derivados solo cuando eviten duplicación real.

Regla: desconocido = **deny by default**.

### MOV-044 — Tests de paridad role → capability

Crear pruebas por cada rol conocido.

Comprobar:

- administrador conserva gestión;
- coordinador conserva gestión operativa;
- técnico conserva ejecución y pierde administración;
- técnico externo no obtiene privilegios nuevos;
- cliente lectura no obtiene gestión;
- rol desconocido no recibe capabilities.

### MOV-045 — Migrar navegación principal

Sustituir decisiones directas de `App.tsx` por capabilities para:

- crear OT;
- clientes;
- técnicos;
- configuración;
- auditoría si procede;
- zona técnico.

No modificar flujos de backend.

### MOV-046 — Migrar `technicianAccess`

Convertir helpers actuales en adaptadores a capabilities o sustituirlos progresivamente.

Debe mantenerse compatibilidad de API temporal si otros componentes todavía los importan.

### MOV-047 — Migrar `clientAccess`

Mismo criterio:

- lectura;
- gestión;
- ninguna ampliación de permisos.

### MOV-048 — Revisar acciones críticas

Comprobar especialmente:

- Nueva OT;
- asignar/reasignar;
- anular;
- revisar/validar;
- invitaciones de técnicos;
- configuración de plantillas;
- navegación administrativa;
- vista técnico.

Cada acción debe seguir protegida por backend además de la UI.

### MOV-049 — Auditoría de Auth/session

Revisar `AuthApp.tsx` para decidir si:

- solo entrega `viewerRole` en esta fase; o
- puede empezar a entregar un contexto de capabilities sin riesgo.

Preferencia OT-02: mantener sesión simple y calcular capabilities en capa compartida, evitando una refactorización grande del login.

### MOV-050 — Tests de regresión UI

Añadir/actualizar tests de:

- navegación por rol/capability;
- visibilidad de Nueva OT;
- visibilidad de módulos administrativos;
- acceso de técnico;
- deny-by-default.

### MOV-051 — Revisión global de diff

Confirmar ausencia de cambios en:

- Supabase;
- SQL;
- RLS;
- RPC;
- migraciones;
- infraestructura;
- producción;
- Platform.

### MOV-052 — Abrir PR OT-02 Draft

PR con:

- matriz antes/después;
- capabilities exactas;
- tests de paridad;
- archivos;
- riesgos;
- rollback;
- futuros cambios diferidos.

### MOV-053 — CI

Requerido:

- install;
- branding guard;
- typecheck;
- lint;
- tests;
- build.

### MOV-054 — Revisión final / Ready

Revisar:

- mismo HEAD validado;
- CI verde;
- diff exacto;
- ningún permiso ampliado accidentalmente.

### MOV-055 — Squash & Merge OT-02

Solo con todos los controles verdes.

### MOV-056 — Preparar OT-03

Nueva rama únicamente desde el nuevo `main`.

OT-03 prevista inicialmente: **OT rápida / creación simplificada**, salvo que OT-02 revele una dependencia arquitectónica que deba resolverse antes.

## 8. Hallazgo GOV-001 — Protección de `main`

Durante la verificación posterior al merge de OT-01, GitHub devolvió:

- `main` actual: `c0612148cae177ce426fab13bcb9cbf80fa5fcc7`;
- `protected: false`;
- protección requerida/status checks: desactivados a nivel de rama.

### Interpretación

Nuestro flujo operativo está usando PR + CI + Squash & Merge, pero GitHub no parece estar **forzándolo técnicamente** mediante branch protection.

### Tratamiento

No se modifica configuración del repositorio dentro de OT-02 porque sería un cambio de gobierno distinto al refactor de aplicación.

Acción futura recomendada independiente:

- activar protección/reglas de `main`;
- exigir PR;
- exigir `Quality` verde;
- impedir force-push/delete;
- definir si se exige revisión adicional.

Debe realizarse como cambio de gobierno separado y verificable.

## 9. Rollback

Antes de merge:

- cerrar PR;
- descartar rama.

Después de merge:

- revertir commit squash de OT-02.

No habrá rollback de base de datos porque OT-02 no debe modificarla.

## 10. Resultado esperado

Al terminar OT-02:

- la UI dejará de depender directamente de nombres de rol en sus decisiones principales;
- habrá una única matriz de compatibilidad role → capability;
- Platform podrá sustituir esa matriz en el futuro sin reescribir toda la interfaz;
- RLS seguirá siendo la autoridad real;
- el comportamiento observable de los roles actuales deberá permanecer igual.
