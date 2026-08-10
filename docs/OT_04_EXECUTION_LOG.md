# IsiVoltPro OT — OT-04 · Contexto técnico de instalaciones

Fecha de inicio: 2026-08-10
Rama: `feat/ot-installation-context`
Base exacta: `main` @ `365f7423ff9143c33632f4f6fb1bb3e81e9bf6da`
Estado: **AUDITORÍA EN CURSO**

## 1. Objetivo provisional

Mejorar el contexto técnico que acompaña a una OT para que IsiVoltPro pueda trabajar en instalaciones nuevas y antiguas sin obligar a tener todo el inventario registrado previamente.

Jerarquía objetivo de producto:

`CLIENTE → INSTALACIÓN → UBICACIÓN/ZONA → SISTEMA TÉCNICO → ACTIVO opcional → OT`

Regla crítica:

> Sistema técnico y activo no deben bloquear la creación de una avería.

OT-04 no creará tablas ni migraciones hasta completar la auditoría de lo que ya existe en `main`.

## 2. Restricciones

1. No tocar producción ni mini PC.
2. No tocar `isivoltpro-platform`.
3. No crear una segunda estructura de clientes/instalaciones/activos.
4. Reutilizar tablas, RPC y componentes existentes siempre que sea posible.
5. No modificar RLS o SQL durante la auditoría.
6. Si existe ya un concepto equivalente a sistema técnico, adaptarlo antes que duplicarlo.
7. Mantener OT rápida sin activo obligatorio.
8. Rama + tests + PR + CI + revisión + Squash & Merge.

## 3. Movimientos OT-04

### MOV-070 — Verificar `main` y crear rama

**COMPLETADO.**

- `main`: `365f7423ff9143c33632f4f6fb1bb3e81e9bf6da`;
- rama: `feat/ot-installation-context`.

### MOV-071 — Crear bitácora

**COMPLETADO con este documento.**

### MOV-072 — Auditar modelo actual

Revisar directamente:

- clientes;
- `sites` / instalaciones;
- `locations`;
- `assets`;
- tablas/migraciones relacionadas;
- catálogos usados al crear OT;
- páginas de clientes/instalaciones;
- cualquier concepto de `system`, `technical_system`, `specialty`, `discipline` o similar.

Salida requerida:

`qué existe → dónde se usa → qué falta → qué se puede reutilizar`.

### MOV-073 — Auditar ramas/PR históricas solo como referencia

Consultar PR #31 únicamente para identificar ideas o nombres ya trabajados sobre sistemas técnicos.

No copiar migraciones ni continuar esa rama.

### MOV-074 — Fijar alcance real de OT-04

Tras la auditoría decidir entre:

A. solo mejorar UI/contexto usando datos existentes;
B. introducir sistema técnico como capa ligera si no existe;
C. posponer sistema técnico y resolver primero ubicaciones/zonas si esa es la carencia real.

No habrá implementación antes de esta decisión.

### MOV-075 — Contrato de dominio

Definir:

- campos;
- opcionalidad;
- relaciones;
- compatibilidad con instalaciones antiguas;
- creación de OT con información parcial;
- enriquecimiento progresivo.

### MOV-076 — Tests del contrato

Proteger especialmente:

- OT sin activo;
- OT sin sistema técnico si aún no se conoce;
- contexto de ubicación;
- aislamiento tenant;
- compatibilidad de registros existentes.

### MOV-077 — Implementación mínima

Solo después de auditoría y contrato.

### MOV-078 — Integración con creación rápida/avanzada

No aumentar los campos obligatorios de OT rápida.

### MOV-079 — Historial / ficha contextual

Mostrar contexto técnico de forma útil en la ficha OT, sin convertir OT en maestro de activos.

### MOV-080 — Tests UI/regresión

### MOV-081 — Revisión global de diff

### MOV-082 — PR OT-04 Draft

### MOV-083 — CI final

### MOV-084 — Ready / revisión final

### MOV-085 — Squash & Merge OT-04

### MOV-086 — Preparar OT-05

Nueva rama exclusivamente desde el `main` resultante.

## 4. Criterios de decisión

OT-04 solo añadirá un concepto nuevo si cumple simultáneamente:

1. no existe equivalente actual;
2. aporta contexto útil a OT;
3. no hace obligatorio registrar un activo;
4. funciona en instalaciones antiguas con información incompleta;
5. puede aislarse correctamente por tenant;
6. no duplica responsabilidades de IsiVoltPro Platform.

## 5. Estado de seguridad

- DB: sin cambios;
- RLS: sin cambios;
- RPC: sin cambios;
- migraciones: sin cambios;
- producción: sin cambios;
- Platform: sin cambios.
