# IsiVoltPro OT — OT-05 · Sistema técnico v1

Fecha de inicio: 2026-08-10
Rama: `feat/ot-technical-systems-v1`
Base: `main` inmediatamente posterior al Squash & Merge de OT-04
Estado: **AUDITORÍA / DISEÑO — SIN MIGRACIÓN**

## 1. Objetivo

Introducir, solo si la auditoría lo justifica, una capa mínima y opcional de **sistema técnico** entre ubicación/instalación y activo/OT.

Jerarquía objetivo:

`CLIENTE → INSTALACIÓN → UBICACIÓN opcional → SISTEMA TÉCNICO opcional → ACTIVO opcional → OT`

Reglas innegociables:

1. una OT debe poder crearse sin sistema técnico;
2. una OT debe poder crearse sin activo;
3. sistema y activo deben poder añadirse progresivamente durante el mantenimiento;
4. no se copiará la migración masiva de la antigua PR #31;
5. no se creará `create_work_order_v2`;
6. no se introducirán en la misma fase especialidades de técnicos, checklist, normativa, backfills agresivos ni catálogo de 21 disciplinas;
7. no se tocará producción/mini PC durante la fase;
8. `isivoltpro-platform` sigue fuera de alcance.

## 2. Principio de compatibilidad

OT-05 no debe convertir datos incompletos de instalaciones antiguas en un error.

Ejemplos válidos tras OT-05:

- Instalación + problema → OT.
- Instalación + ubicación + problema → OT.
- Instalación + sistema + problema → OT.
- Instalación + ubicación + sistema + activo + problema → OT.

El sistema técnico aporta contexto; no es un requisito de creación.

## 3. Movimientos OT-05

### MOV-086 — Crear rama desde nuevo `main`

**COMPLETADO.**

Rama:

`feat/ot-technical-systems-v1`

Creada desde `main` después del merge validado de OT-04.

### MOV-087 — Crear bitácora OT-05

**COMPLETADO con este documento.**

### MOV-088 — Auditar esquema actual tras OT-04

Revisar:

- `instalaciones`;
- `ubicaciones`;
- `activos`;
- `ordenes_trabajo`;
- índices/FK actuales;
- RLS;
- soft delete;
- catálogo de creación OT.

Objetivo:

identificar la menor ampliación posible sin romper relaciones actuales.

### MOV-089 — Auditar la RPC `create_work_order`

Determinar:

- firma actual;
- cómo valida tenant/instalación/ubicación/activo/técnico;
- si puede evolucionar de forma compatible;
- si añadir un argumento opcional rompería llamadas existentes.

Preferencia inicial:

no modificar la RPC en la primera subfase de sistema técnico si puede separarse la persistencia del contexto.

### MOV-090 — Revisar PR #31 solo como referencia técnica

Extraer únicamente:

- forma de tabla propuesta;
- validación de tenant/instalación;
- FK/soft delete;
- errores aprendidos.

Descartar del alcance OT-05:

- 21 especialidades;
- especialidades de técnicos;
- cambios de checklist;
- normativa masiva;
- backfills automáticos;
- `create_work_order_v2`;
- múltiples migraciones encadenadas de la rama antigua.

### MOV-091 — Decidir alcance de datos v1

Escoger una de estas opciones:

A. tabla de sistemas únicamente, sin enlazar todavía OT/activos;
B. tabla + referencia opcional en activos;
C. tabla + referencia opcional en OT;
D. tabla + referencias opcionales en activos y OT, solo si la migración/RPC siguen siendo pequeñas y compatibles.

No se implementará nada antes de cerrar esta decisión.

### MOV-092 — Fijar contrato de dominio

Definir campos mínimos. Candidato inicial, sujeto a auditoría:

- id;
- tenant_id;
- instalacion_id;
- ubicacion_id opcional;
- nombre;
- codigo opcional;
- tipo/especialidad simple opcional;
- criticidad simple opcional;
- descripcion opcional;
- estado;
- created_at;
- updated_at;
- deleted_at.

No introducir JSON técnico ni normativa en v1 salvo necesidad demostrada.

### MOV-093 — Diseñar RLS/FK/índices/rollback

Antes de SQL:

- tenant isolation;
- gestión alineada con `can_manage_work_orders`;
- FK restrictiva donde preserve histórico;
- validación de que ubicación pertenece a la misma instalación/tenant;
- estrategia de rollback;
- compatibilidad de registros antiguos.

### MOV-094 — Tests de contrato SQL / migración

Preparar casos de aceptación antes de aplicar la migración:

- tenant A no ve B;
- sistema de instalación A no puede usar ubicación B;
- soft delete;
- duplicados/códigos;
- OT antigua sin sistema sigue válida;
- activo antiguo sin sistema sigue válido.

### MOV-095 — Implementar migración mínima

Solo después de MOV-088…094.

Una migración pequeña y reversible.

No backfill de OT oficiales salvo necesidad estricta y validada.

### MOV-096 — Repository/API de sistemas

Crear capa frontend aislada para:

- listar;
- crear;
- editar;
- activar/desactivar.

### MOV-097 — Capability de gestión

Candidata:

`installations.systems.manage`

Inicialmente esperada para:

- admin_cliente;
- coordinador.

Debe validarse contra RLS antes de implementarse.

### MOV-098 — Panel de sistemas en instalación

Mostrar sistemas debajo de ubicaciones en la ficha de instalación.

No convertirlo en módulo maestro global.

### MOV-099 — Integración con activo

Solo si MOV-091 decide incluir relación de activo.

Sistema seguirá siendo opcional.

### MOV-100 — Integración con OT avanzada

Solo si el contrato de persistencia ya es seguro.

La OT rápida no ganará un campo obligatorio.

### MOV-101 — Integración con OT rápida

Si se ofrece sistema en Rápida será **opcional y progresivo**; no debe alargar el camino mínimo.

### MOV-102 — Contexto en ficha OT

Mostrar sistema técnico cuando exista, y `Sin sistema identificado` cuando no.

### MOV-103 — Tests UI/regresión

Proteger:

- sistema opcional;
- activo opcional;
- instalaciones antiguas;
- permisos;
- invalidación de catálogo;
- no regreso de `create_work_order_v2`.

### MOV-104 — Revisión global de diff

Confirmar alcance exacto y ausencia de cambios no previstos.

### MOV-105 — PR OT-05 Draft

Abrir solo cuando exista una primera subfase coherente y testeada; puede abrirse antes del final para CI incremental.

### MOV-106 — CI final

Quality + tests SQL si existe migración.

### MOV-107 — Revisión final / Ready

Mismo HEAD + CI verde + diff exacto + migración revisada.

### MOV-108 — Squash & Merge OT-05

Solo después de todos los controles.

### MOV-109 — Preparar OT-06

Nueva rama exclusivamente desde el `main` resultante.

Posibles siguientes bloques, a decidir tras OT-05:

- activos enriquecidos/descubrimiento progresivo;
- múltiples técnicos/visitas;
- planificación visual;
- bloqueos/SLA.

## 4. Fuera de alcance

OT-05 no incluirá en bloque:

- catálogo exhaustivo de especialidades;
- normativa por disciplina;
- especialidades de técnicos;
- lógica de checklist multisector;
- mantenimiento preventivo nuevo si ya existe;
- inventario/almacén;
- suscripciones/global auth;
- Platform.

## 5. Estado de seguridad al iniciar

- migraciones: sin cambios;
- DB: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- producción: sin cambios;
- mini PC: sin cambios;
- Platform: sin cambios.
