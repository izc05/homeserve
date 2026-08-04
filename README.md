# IsiVoltPro OT

Gestor profesional de órdenes de trabajo para mantenimiento técnico y primera aplicación operativa del ecosistema IsiVoltPro.

## Objetivo

Construir una aplicación web y móvil centrada en el ciclo completo de las órdenes de trabajo:

1. El responsable crea y prepara la OT.
2. Define el checklist y los requisitos de cierre.
3. Asigna la OT a un técnico activo.
4. El técnico acepta, inicia y ejecuta únicamente sus OT.
5. Registra checklist, observaciones, fotos, mediciones, materiales y firmas.
6. Envía la OT para revisión.
7. El responsable revisa, solicita correcciones o valida.
8. El sistema conserva el informe final y la auditoría.

## Experiencias de usuario

- **Panel central**: administración, coordinación, asignación, planificación, seguimiento, revisión, informes y usuarios.
- **Zona técnico**: consulta y ejecución de las OT asignadas, sin acceso a gestión ni a OT de otros técnicos.

## Ecosistema IsiVoltPro

IsiVoltPro OT es el primer producto de una familia de herramientas técnicas. La portada del ecosistema está disponible en `ecosystem.html` y la estrategia completa se documenta en [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md).

Módulos previstos:

- Activos QR / NFC.
- Inventario, almacén y herramientas.
- Inspecciones eléctricas.
- RITE, climatización y refrigeración.
- PCI.
- Legionella.
- Cálculos técnicos.
- Informes y documentación.

## Tecnología

- React + TypeScript + Vite.
- Supabase Auth, PostgreSQL, Storage privado y Realtime.
- Row Level Security para permisos reales.
- PWA instalable en móvil.
- Capacitor para APK cuando la PWA esté estable.
- Vitest y pruebas de aceptación.

## Roles iniciales

### Administrador

Control total del sistema, usuarios, configuración, auditoría y todas las OT.

### Coordinador

Crea, asigna, planifica, revisa y valida OT.

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

## Documentación principal

- [`CLAUDE.md`](CLAUDE.md): reglas obligatorias para agentes.
- [`AGENTS.md`](AGENTS.md): normas comunes de desarrollo.
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): alcance funcional.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitectura técnica.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de datos y permisos.
- [`docs/SECURITY.md`](docs/SECURITY.md): requisitos de seguridad.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de construcción.
- [`docs/QA_ACCEPTANCE.md`](docs/QA_ACCEPTANCE.md): pruebas y criterios de aceptación.
- [`docs/UI_FLOWS.md`](docs/UI_FLOWS.md): pantallas y recorridos.
- [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md): visión y estructura del ecosistema.

## Reglas innegociables

- Ningún permiso crítico depende solo de React.
- Un técnico no puede leer ni modificar la OT de otro técnico.
- Toda OT validada queda inmutable salvo reapertura administrativa auditada.
- No se puede finalizar una OT con requisitos obligatorios incompletos.
- Los informes finales se versionan.
- Toda acción crítica queda registrada en auditoría.
- No se almacenan contraseñas propias ni credenciales demo en el código.
- No se incluyen logos o marcas de terceros sin autorización.

## Publicación prevista

El proyecto queda preparado para publicarse bajo la ruta `/isivoltpro-ot/`. Antes de activar GitHub Pages en un repositorio nuevo, deben configurarse las variables de Supabase y revisar el flujo de despliegue.
