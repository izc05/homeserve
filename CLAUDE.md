# CLAUDE.md

Estas instrucciones son obligatorias para Claude y cualquier agente que trabaje en este repositorio.

## Misión

Construir IsiVoltPro OT: una aplicación profesional y sencilla para crear, asignar, ejecutar, revisar, validar y documentar órdenes de trabajo.

No convertir el proyecto en un ERP, inventario general, módulo OCA ni gestor documental. Instalaciones, ubicaciones, activos y materiales son datos auxiliares de las OT.

## Referencia permitida

El repositorio `izc05/isivolpro-activos` puede estudiarse para adaptar autenticación, Supabase, RLS, checklist, visitas, fotos, firmas, PDF y auditoría. No copiar módulos fuera de alcance, compatibilidad antigua, marcas de terceros ni código sin revisar.

## Supabase oficial

- Proyecto: `izc05's Project`
- Project ref: `ubfbhzovebrmmjpyygnm`
- URL: `https://ubfbhzovebrmmjpyygnm.supabase.co`
- Región: `eu-west-1`

La base contiene datos y tablas heredadas de `isivolpro-activos`. Leer `docs/SUPABASE_PROJECT.md` antes de tocar el esquema.

Reglas obligatorias:

- No borrar, truncar ni reemplazar tablas existentes.
- No aplicar migraciones destructivas sin aprobación expresa de Isicio.
- Mantener compatibilidad de lectura con roles y estados heredados durante la transición.
- Generar tipos TypeScript desde el proyecto después de cada cambio de esquema.
- Ejecutar advisors de seguridad y rendimiento después de cada DDL.
- Nunca incluir `service_role`, secret keys o contraseña de base de datos.

## Roles

- Administrador: control total, usuarios, configuración, auditoría y todas las OT.
- Coordinador: crea, asigna, planifica, revisa y valida OT.
- Técnico: solo ve y ejecuta sus OT asignadas.

Los permisos críticos deben aplicarse en PostgreSQL con RLS y triggers, no solo en React.

La base heredada usa `admin_cliente`, `tecnico`, `tecnico_externo` y `cliente_lectura`. Aplicar el mapeo temporal definido en `docs/SUPABASE_PROJECT.md`; no modificar el constraint hasta disponer de migración y pruebas RLS.

## Estados oficiales

`BORRADOR`, `ASIGNADA`, `ACEPTADA`, `EN_CURSO`, `BLOQUEADA`, `FINALIZADA_TECNICO`, `VALIDADA`, `CANCELADA`.

Transiciones:

- BORRADOR → ASIGNADA o CANCELADA.
- ASIGNADA → ACEPTADA o CANCELADA.
- ACEPTADA → EN_CURSO o BLOQUEADA.
- EN_CURSO → BLOQUEADA o FINALIZADA_TECNICO.
- BLOQUEADA → EN_CURSO o CANCELADA.
- FINALIZADA_TECNICO → VALIDADA o EN_CURSO por corrección.
- VALIDADA y CANCELADA → solo lectura.

No añadir estados sin actualizar documentación, migraciones y pruebas.

La base heredada todavía admite 14 estados. Hasta ejecutar una migración aprobada, usar el adaptador de estados documentado en `docs/SUPABASE_PROJECT.md` y no asumir que todos los registros ya contienen los estados nuevos.

## Reglas del técnico

- Solo puede leer OT con `assigned_to = auth.uid()`.
- No puede modificar asignación, prioridad, definición, requisitos ni checklist preparado.
- Solo puede rellenar checklist después de iniciar la intervención.
- No puede validar ni cancelar OT.
- No puede consultar OT de otros técnicos, incluso con URL o UUID conocidos.

## Orden obligatorio de construcción

1. React + TypeScript + Vite.
2. Supabase y variables de entorno.
3. Auditoría del esquema existente y migración compatible.
4. Autenticación y organizaciones.
5. RLS y pruebas de permisos.
6. Creación y asignación de OT.
7. Zona técnico.
8. Checklist, fotos y mediciones.
9. Visitas, tiempos, bloqueos y materiales.
10. Firmas, revisión administrativa y PDF.
11. Realtime, PWA, QA y publicación.

No comenzar por APK, gráficos o diseño final antes de cerrar modelo, autenticación y RLS.

## Convenciones

- TypeScript estricto.
- Nombres de código en inglés y textos visibles en español.
- React Hook Form y Zod para formularios.
- Fechas almacenadas en UTC.
- UUID para entidades.
- Toda tabla operativa incluye `tenant_id`, `created_at`, `updated_at` y trazabilidad de autor cuando proceda.
- No usar `any` sin justificación.
- No crear componentes gigantes; separar dominio, interfaz y servicios.

## Seguridad

- Nunca almacenar contraseñas en tablas propias.
- Nunca exponer `service_role` al navegador.
- Fotos, firmas y PDF en almacenamiento privado.
- No confiar en rutas protegidas de React como barrera real.
- No incluir datos personales reales ni credenciales demo en seeds.
- Toda acción crítica debe quedar auditada.
- Revisar cada función `SECURITY DEFINER`; no aplicar cambios masivos sin analizar dependencias de RLS.

## Diseño

Panel central: Inicio, OT, Planificación, Técnicos, Informes y Configuración.

Técnico: Mis trabajos, Escanear, Historial y Cuenta.

Móvil primero para técnicos; escritorio primero para coordinación. Controles táctiles mínimos de 44 px, texto legible, zoom permitido y estados diferenciados por texto e icono además del color.

## Definición de terminado

Una funcionalidad requiere interfaz, validación, RLS, manejo de errores, carga, pruebas, documentación y ausencia de secretos.

## Flujo de trabajo del agente

Antes de modificar código:

1. Leer README, CLAUDE, AGENTS y documentación relacionada.
2. Inspeccionar el código y el esquema existente.
3. Explicar impacto en estados, permisos, datos y PDF.
4. Implementar una unidad completa y pequeña.
5. Ejecutar pruebas.
6. Ejecutar advisors si hubo DDL.
7. Regenerar tipos si cambió el esquema.
8. Actualizar documentación.

Requieren aprobación de Isicio: nuevo rol, nuevo estado, cambio de alcance, eliminación de datos, servicio de pago, cambio de marca, publicación o APK.
