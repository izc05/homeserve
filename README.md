# IsiVoltPro OT / Mantenimiento

Módulo profesional de mantenimiento y órdenes de trabajo del ecosistema IsiVoltPro.

> El nombre actual del repositorio (`homeserve`) se mantiene temporalmente por continuidad técnica e histórica. El producto y la evolución funcional se desarrollan bajo la identidad **IsiVoltPro**.

## Objetivo

Construir una aplicación web y móvil capaz de gestionar el ciclo completo del mantenimiento técnico sobre instalaciones nuevas, existentes o antiguas:

1. Registrar un aviso, avería, preventivo, inspección, instalación o trabajo técnico.
2. Identificar cliente, instalación y ubicación, aunque todavía no exista un inventario completo.
3. Relacionar opcionalmente sistema técnico y activo/equipo.
4. Planificar y asignar el trabajo a uno o varios técnicos.
5. Registrar una o varias visitas/intervenciones.
6. Ejecutar checklist, mediciones, fotografías, materiales, observaciones y firmas.
7. Gestionar bloqueos, relevo, tiempos, prioridades y vencimientos.
8. Finalizar y enviar la OT a revisión.
9. Validar, solicitar correcciones o reabrir de forma auditada.
10. Conservar informe PDF, evidencias e histórico técnico.
11. Utilizar cada intervención para mejorar progresivamente el conocimiento de la instalación.

## Principio del producto

La **Orden de Trabajo (OT)** es el núcleo operativo de IsiVoltPro Mantenimiento.

La aplicación tendrá dos experiencias principales:

- **Panel central**: administración operativa, coordinación, planificación, asignación, seguimiento, revisión, informes e indicadores.
- **Zona técnico**: trabajos asignados, ejecución, visitas, evidencias, checklist, mediciones, materiales, bloqueos, relevo y cierre.

Instalaciones, ubicaciones, sistemas técnicos y activos dejan de ser simples datos auxiliares. Forman parte del conocimiento técnico necesario para mantener una instalación, pero **no será obligatorio tener todo inventariado para poder crear y resolver una OT**.

Esto permite trabajar tanto con instalaciones nuevas perfectamente documentadas como con instalaciones antiguas que se van documentando progresivamente durante las intervenciones.

## Alcance funcional

El módulo podrá evolucionar para cubrir:

- mantenimiento correctivo y averías;
- mantenimiento preventivo;
- revisiones e inspecciones;
- instalaciones nuevas y puestas en marcha;
- modificaciones y sustituciones;
- clientes, instalaciones, zonas y ubicaciones;
- sistemas técnicos;
- activos y equipos;
- técnico responsable y colaboradores;
- empresas externas;
- múltiples visitas por OT;
- relevo entre técnicos;
- planificación y carga de trabajo;
- bloqueos y SLA;
- checklist dinámicos;
- mediciones estructuradas;
- fotografías y evidencias;
- materiales utilizados;
- firmas;
- informes PDF versionados;
- histórico técnico;
- QR/NFC;
- indicadores operativos y alertas.

La autenticación común del ecosistema, suscripciones, catálogo comercial de aplicaciones y portal global se resolverán posteriormente desde **IsiVoltPro Platform**. Este repositorio debe mantener la lógica de mantenimiento preparada para esa futura integración sin duplicar la plataforma global.

## Jerarquía funcional

```text
Organización
  → Cliente
    → Instalación
      → Zona / ubicación
        → Sistema técnico (opcional en una OT)
          → Activo / equipo (opcional en una OT)
            → Orden de trabajo
              → Visitas / intervenciones
                → Evidencias / mediciones / materiales
                  → Cierre / validación
                    → Histórico
```

## Tecnología actual

- React + TypeScript + Vite.
- Supabase Auth, PostgreSQL, Storage privado y Realtime.
- Row Level Security como control real de permisos.
- PWA instalable en móvil.
- Capacitor para APK cuando la PWA esté estable.
- Generación de informes PDF.
- Vitest y herramientas de prueba del proyecto.

## Roles operativos iniciales

### Administrador

Control operativo completo del módulo, usuarios, configuración, auditoría y OT según los permisos del tenant.

### Coordinador

Crea, asigna, planifica, revisa y valida OT.

### Técnico

Consulta y ejecuta los trabajos a los que tiene acceso, registra evidencias e intervenciones y completa el cierre técnico.

La futura IsiVoltPro Platform será la autoridad para el modelo global de organizaciones, usuarios, aplicaciones contratadas y capacidades compartidas.

## Estados actuales de OT

- `BORRADOR`
- `ASIGNADA`
- `ACEPTADA`
- `EN_CURSO`
- `BLOQUEADA`
- `FINALIZADA_TECNICO`
- `VALIDADA`
- `CANCELADA`

Los motivos de bloqueo se mantienen separados del estado y podrán ampliarse sin multiplicar innecesariamente la máquina de estados.

## Documentación principal

- [`docs/ISIVOLTPRO_MAINTENANCE_V2.md`](docs/ISIVOLTPRO_MAINTENANCE_V2.md): dirección maestra de evolución del producto.
- [`CLAUDE.md`](CLAUDE.md): reglas obligatorias para agentes compatibles.
- [`AGENTS.md`](AGENTS.md): normas comunes para agentes de desarrollo.
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md): especificación funcional existente.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitectura técnica.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de datos y permisos.
- [`docs/SECURITY.md`](docs/SECURITY.md): requisitos de seguridad.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases de construcción existentes.
- [`docs/QA_ACCEPTANCE.md`](docs/QA_ACCEPTANCE.md): pruebas y criterios de aceptación.
- [`docs/UI_FLOWS.md`](docs/UI_FLOWS.md): pantallas y recorridos.

## Reglas innegociables

- Ningún permiso crítico depende solo de React.
- El backend y RLS son la autoridad real de acceso mientras este módulo use Supabase.
- Toda OT validada queda inmutable salvo reapertura administrativa auditada.
- No se puede finalizar una OT con requisitos obligatorios incompletos.
- Los PDFs nunca se sobrescriben; se versionan.
- Toda acción crítica queda registrada en auditoría.
- No se almacenan contraseñas propias ni credenciales demo en el código.
- No se incluyen logos o marcas de terceros sin autorización.
- No se debe exigir un activo inventariado para atender una avería.
- Las mejoras deben preservar las OT existentes y su histórico.
- No se desplegarán cambios de desarrollo en producción sin validación previa.

## Estrategia de evolución

1. Base de mantenimiento e instalaciones.
2. Creación rápida de OT.
3. Creación avanzada de OT.
4. Varios técnicos y múltiples visitas.
5. Relevo de turno.
6. Planificación visual.
7. Bloqueos, SLA y tiempos.
8. QR/NFC e histórico.
9. Preventivos.
10. Dashboard e indicadores.
11. Integración posterior con IsiVoltPro Platform.

La prioridad es conseguir primero un ciclo de mantenimiento excelente y después integrarlo en el portal único del ecosistema IsiVoltPro.
