# IsiVoltPro OT

Gestor profesional de órdenes de trabajo para mantenimiento técnico.

## Objetivo

Construir una única aplicación web y móvil centrada exclusivamente en el ciclo completo de las órdenes de trabajo:

1. El responsable crea y prepara la OT.
2. El responsable define el checklist y los requisitos de cierre.
3. La OT se asigna a un técnico activo.
4. El técnico acepta, inicia y ejecuta únicamente sus OT.
5. El técnico registra checklist, observaciones, fotos, mediciones, materiales y firmas.
6. El técnico envía la OT para revisión.
7. El responsable revisa, solicita correcciones o valida.
8. El sistema genera y conserva el informe PDF final y la auditoría.

## Principio del producto

La aplicación tendrá una sola base de datos y dos experiencias claramente separadas:

- **Panel central**: administración, coordinación, asignación, planificación, seguimiento, revisión, informes y usuarios.
- **Zona técnico**: consulta y ejecución de las OT asignadas, sin acceso a gestión ni a OT de otros técnicos.

No se desarrollará como un gestor genérico de activos, inventario, OCA o mantenimiento completo. Instalaciones, ubicaciones, activos y materiales existirán únicamente como datos auxiliares de una OT.

## Tecnología prevista

- React + TypeScript + Vite.
- Supabase Auth, PostgreSQL, Storage privado y Realtime.
- Row Level Security como control real de permisos.
- PWA instalable en móvil.
- Capacitor para APK cuando la PWA esté estable.
- jsPDF o generación de PDF en servidor según las pruebas de calidad.
- Vitest y Playwright para pruebas.

## Roles iniciales

### Administrador

Control total del sistema, usuarios, configuración, auditoría y todas las OT.

### Coordinador

Crea, asigna, planifica, revisa y valida OT. No administra la infraestructura global del sistema.

### Técnico

Solo puede ver y ejecutar las OT que tiene asignadas. No puede cambiar la definición, prioridad, técnico asignado ni checklist de una OT enviada.

## Estados oficiales de OT

- `BORRADOR`
- `ASIGNADA`
- `ACEPTADA`
- `EN_CURSO`
- `BLOQUEADA`
- `FINALIZADA_TECNICO`
- `VALIDADA`
- `CANCELADA`

El motivo de bloqueo se guarda aparte: material, acceso, responsable, empresa externa u otro.

## Documentación principal

- [`CLAUDE.md`](CLAUDE.md): reglas obligatorias para Claude y otros agentes.
- [`AGENTS.md`](AGENTS.md): normas comunes para cualquier agente de desarrollo.
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): alcance funcional completo.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitectura técnica.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de datos y permisos.
- [`docs/SECURITY.md`](docs/SECURITY.md): requisitos de seguridad.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de construcción.
- [`docs/QA_ACCEPTANCE.md`](docs/QA_ACCEPTANCE.md): pruebas y criterios de aceptación.
- [`docs/UI_FLOWS.md`](docs/UI_FLOWS.md): pantallas y recorridos.

## Reglas innegociables

- Ningún permiso crítico depende solo de React.
- Un técnico no puede leer ni modificar la OT de otro técnico, aunque conozca la URL o el UUID.
- Toda OT validada queda inmutable salvo reapertura administrativa auditada.
- No se puede finalizar una OT con requisitos obligatorios incompletos.
- Los PDFs nunca se sobrescriben; se versionan.
- Toda acción crítica queda registrada en auditoría.
- No se almacenan contraseñas propias ni credenciales demo en el código.
- No se incluyen logos o marcas de terceros sin autorización.

## Estado actual

Proyecto inicializado. La primera fase consiste en crear el esqueleto React, las migraciones de Supabase y la autenticación con roles antes de desarrollar las pantallas operativas.
