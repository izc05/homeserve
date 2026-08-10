# IsiVoltPro OT

Módulo profesional de **órdenes de trabajo y partes de intervención** del ecosistema IsiVoltPro.

> El repositorio conserva temporalmente el nombre histórico `homeserve`, pero el producto objetivo es **IsiVoltPro OT**. La identidad HomeServe no forma parte del destino del producto.

## Objetivo

IsiVoltPro OT se centra en el ciclo completo de un trabajo:

1. registrar una solicitud, avería, preventivo, inspección, instalación u otro trabajo;
2. relacionarlo con cliente/instalación y, cuando existan, ubicación, sistema o activo;
3. preparar y planificar la OT;
4. asignarla a uno o varios participantes de forma progresiva;
5. aceptar e iniciar la intervención;
6. registrar visitas, checklist, fotografías, mediciones, materiales, observaciones y firmas;
7. gestionar bloqueos, relevo y tiempos;
8. finalizar técnicamente;
9. revisar, corregir o validar;
10. conservar PDF, evidencias, histórico y auditoría;
11. comunicar el resultado al resto del ecosistema mediante contratos de integración.

## Principio del producto

**OT gestiona el trabajo. No gestiona por sí sola toda la instalación.**

La aplicación mantiene dos experiencias principales:

- **Panel central**: creación, asignación, planificación, seguimiento, revisión, informes y auditoría OT.
- **Zona técnico**: trabajos asignados, ejecución, visitas, evidencias, bloqueos, relevo y cierre.

Una OT debe poder crearse aunque el activo todavía no esté inventariado. Esto permite trabajar tanto en instalaciones nuevas como antiguas o incompletamente documentadas.

## Relación con el ecosistema IsiVoltPro

### IsiVoltPro Platform

Será la fuente común para organización, usuarios, clientes, instalaciones, permisos y aplicaciones contratadas.

### IsiVoltPro Activos

Será responsable de identidad física/documental, activos y QR/NFC. Desde un activo podrá abrirse una OT con el contexto precargado.

### IsiVoltPro Mantenimiento

Será responsable del control técnico de instalaciones, sistemas, planes y preventivos. Podrá generar OT y recibir el resultado cuando queden validadas.

### IsiVoltPro Almacén

Será responsable de stock y movimientos. OT registrará el material usado y podrá sincronizar referencias de consumo.

### Apps técnicas

Inspecciones, Legionella, Refrigeración/RITE, PCI y futuras aplicaciones podrán generar trabajos en OT y recibir su resultado.

## Regla de integración

Los módulos se conectarán mediante:

- IDs comunes;
- adapters/directorios;
- capabilities;
- deep links;
- eventos versionados e idempotentes.

OT no debe acceder directamente a las tablas internas de otro módulo como contrato definitivo.

## Tecnología actual

- React 18 + TypeScript + Vite.
- Supabase Auth, PostgreSQL, Storage privado y Realtime.
- Row Level Security y RPC para permisos/transiciones críticas.
- PWA/web responsive.
- Vitest/Testing Library y pruebas SQL/RLS.
- GitHub Actions.

Supabase continúa como backend operativo de OT mientras IsiVoltPro Platform se desarrolla por separado.

## Estados canónicos de OT

- `BORRADOR`
- `ASIGNADA`
- `ACEPTADA`
- `EN_CURSO`
- `BLOQUEADA`
- `FINALIZADA_TECNICO`
- `VALIDADA`
- `CANCELADA`

Los motivos de bloqueo se almacenan separados del estado y se estructurarán progresivamente.

## Documentación principal

- [`AGENTS.md`](AGENTS.md): reglas obligatorias para agentes de desarrollo.
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): alcance funcional.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitectura objetivo.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de datos actual.
- [`docs/SECURITY.md`](docs/SECURITY.md): requisitos de seguridad.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de evolución.
- [`docs/QA_ACCEPTANCE.md`](docs/QA_ACCEPTANCE.md): criterios de aceptación.
- [`docs/UI_FLOWS.md`](docs/UI_FLOWS.md): recorridos de interfaz.
- [`docs/OT_EXECUTION_MASTER_PLAN.md`](docs/OT_EXECUTION_MASTER_PLAN.md): plan maestro de transformación.
- [`docs/OT_AUDIT_MATRIX.md`](docs/OT_AUDIT_MATRIX.md): matriz KEEP/REFACTOR/BRIDGE/MOVE/REMOVE.
- [`docs/OT_INTEGRATION_CONTRACT_DRAFT.md`](docs/OT_INTEGRATION_CONTRACT_DRAFT.md): contrato preliminar con Platform y otros módulos.
- [`docs/OT_DEVELOPMENT_LOG.md`](docs/OT_DEVELOPMENT_LOG.md): bitácora detallada de movimientos.

## Reglas innegociables

- `main` debe permanecer estable.
- ningún permiso crítico depende solo de React;
- un técnico no accede a la OT de otro por conocer URL/UUID;
- toda OT validada queda inmutable salvo mecanismo administrativo auditado;
- no se finaliza con requisitos obligatorios incompletos;
- los PDF no se sobrescriben: se versionan;
- toda acción crítica queda auditada;
- las migraciones aplicadas no se editan;
- no se almacenan secretos en frontend;
- no se despliega al mini PC hasta validar rama, pruebas y rollback;
- este flujo no modifica `isivoltpro-platform`, que se desarrolla de forma independiente.

## Estrategia de desarrollo

```text
alcance
  ↓
rama específica
  ↓
cambio pequeño
  ↓
pruebas
  ↓
bitácora
  ↓
PR
  ↓
revisión
  ↓
merge
```

El objetivo no es reconstruir la aplicación desde cero, sino **conservar el núcleo que ya funciona, desacoplar lo que pertenece a otros módulos y perfeccionar OT de forma incremental**.
