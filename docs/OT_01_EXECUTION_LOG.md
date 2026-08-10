# IsiVoltPro OT — OT-01 · Limpieza de identidad y dominio visible

Fecha de inicio: 2026-08-10
Rama: `refactor/ot-identity-domain-cleanup`
Base exacta: `main` @ `dc712b1974f81b52c7c8d1a1e73854d87760c376`
Estado: **EN CURSO**

## Objetivo de OT-01

Eliminar del producto OT las referencias visibles que lo atan a un dominio concreto o a identidad heredada, manteniendo intactos los datos, la seguridad, las RPC y la compatibilidad histórica.

OT-01 es una fase de **limpieza de frontend y fronteras de dominio**. No introduce todavía integración con Platform, no mueve tablas y no modifica el modelo de datos.

## Reglas de seguridad de la fase

1. No modificar producción ni mini PC.
2. No desplegar durante esta fase.
3. No modificar `isivoltpro-platform`.
4. No modificar tablas, datos, RLS ni funciones SQL.
5. No editar migraciones ya aplicadas.
6. No borrar activos, clientes, instalaciones ni históricos existentes.
7. No romper enlaces o referencias internas de OT existentes.
8. Cada cambio funcional debe tener prueba o verificación asociada.
9. Cada bloque se revisa antes del siguiente.
10. La fase termina en PR separada y no se fusiona si CI falla.

## Plan de movimientos

### MOV-024 — Crear rama OT-01

- Rama creada desde el commit exacto de `main` posterior a OT-00.
- Resultado esperado: rama limpia y sin arrastrar ramas anteriores.
- Estado: **COMPLETADO**.

### MOV-025 — Crear bitácora OT-01

- Crear este documento antes de tocar código.
- Registrar alcance, límites, pasos, pruebas y rollback.
- Estado: **COMPLETADO con este commit**.

### MOV-026 — Auditoría visible de `src/App.tsx`

Revisar:

- navegación principal/secundaria;
- etiquetas de módulos;
- entrada a activos;
- referencias a FV/fotovoltaica;
- referencias HomeServe visibles;
- comprobaciones directas por rol;
- presets o deep-links desde activo hacia OT.

Salida: lista exacta de cambios permitidos en OT-01.

### MOV-027 — Auditoría de branding en frontend

Buscar en archivos de interfaz y demo:

- `HomeServe`;
- `FV`;
- `fotovoltaic*`;
- `Equipos FV`;
- nombres de módulos heredados.

Clasificar cada coincidencia:

- retirar ahora;
- mantener por compatibilidad interna;
- dejar para fase posterior;
- solo demo/documentación.

### MOV-028 — Definir nomenclatura genérica OT

Nombres objetivo:

- `Activo` / `Activos` cuando OT necesita referenciar un equipo;
- `Instalación` como centro o emplazamiento operativo;
- `Sistema` cuando proceda en fases posteriores;
- ninguna especialidad técnica será el centro del producto.

No se añadirá todavía un módulo maestro de Activos dentro de OT.

### MOV-029 — Retirar `Equipos FV` de navegación

Cambio mínimo:

- eliminar etiqueta específica `Equipos FV` del menú OT;
- evitar que el panel central parezca una aplicación fotovoltaica;
- mantener rutas/compatibilidad interna si eliminarlas pudiera romper enlaces existentes;
- no borrar datos ni componentes en este movimiento.

### MOV-030 — Neutralizar textos visibles específicos

Sustituir únicamente textos de UI necesarios para que OT sea multisector:

- FV → activo/equipo cuando corresponda;
- referencias sectoriales heredadas → terminología genérica;
- mantener nombres técnicos internos si cambiarlos no aporta valor y aumenta riesgo.

### MOV-031 — Revisar identidad HomeServe visible

- Confirmar qué restos siguen siendo visibles en runtime.
- El workflow ya rechaza branding visible heredado; no se confiará solo en ese grep.
- Corregir solo lo que realmente llegue a la UI o metadatos de producto.

### MOV-032 — Introducir frontera de acceso compatible, solo si es segura

Objetivo limitado:

- no reescribir permisos;
- no tocar backend;
- si el cambio es pequeño y probado, centralizar el significado de `isManagerRole`/roles visibles en una función de compatibilidad;
- si requiere demasiados archivos, posponerlo a OT-02 y documentarlo.

### MOV-033 — Tests de regresión de navegación/branding

Añadir o actualizar pruebas para comprobar como mínimo:

- no aparece `Equipos FV` en la navegación objetivo;
- no aparece branding HomeServe visible;
- `Activos` no se presenta como módulo maestro nuevo si no corresponde;
- rutas críticas de OT siguen accesibles;
- manager/técnico conservan navegación esperada.

### MOV-034 — Revisión del diff funcional

Comprobar que OT-01 no modifica:

- `supabase/migrations`;
- RLS;
- SQL;
- datos;
- almacenamiento;
- despliegue;
- Platform.

### MOV-035 — Validación automática

Ejecutar mediante CI de PR:

- instalación reproducible;
- branding guard;
- typecheck;
- lint;
- tests;
- build.

Si falla cualquier punto, no merge.

### MOV-036 — Revisión visual

Verificar conceptualmente y mediante tests/capturas disponibles:

- escritorio;
- móvil;
- navegación;
- coherencia de nombres;
- ausencia de regresiones obvias.

No se despliega a producción para esta comprobación.

### MOV-037 — Abrir PR OT-01 en borrador

PR deberá incluir:

- archivos exactos;
- antes/después;
- pruebas;
- riesgos;
- rollback;
- cambios diferidos;
- confirmación de ausencia de DB/producción.

### MOV-038 — CI y revisión final

- esperar conclusión real de GitHub Actions;
- revisar changed files y patch;
- registrar resultado;
- pasar a ready solo si todo está correcto.

### MOV-039 — Squash & Merge OT-01

Solo después de:

- CI verde;
- diff revisado;
- no cambios fuera de alcance;
- rollback claro.

### MOV-040 — Preparar OT-02

Crear nueva rama exclusivamente desde el `main` resultante.

OT-02 prevista: **capabilities y desacoplamiento de identidad/roles**, salvo que la auditoría OT-01 recomiende otra secuencia.

## Archivos inicialmente candidatos

- `src/App.tsx`
- tests relacionados con navegación/App
- posibles componentes de branding
- componentes demo solo si contaminan producto objetivo
- estilos únicamente si el cambio visible lo necesita

## Archivos fuera de alcance

- `supabase/migrations/**`
- `supabase/tests/**` salvo que accidentalmente un cambio frontend lo requiera, algo que no se espera
- configuración de Cloudflare
- scripts de despliegue
- mini PC
- `isivoltpro-platform`

## Criterio de rollback

Mientras OT-01 no se fusione, rollback = cerrar la PR y descartar la rama.

Después de merge, rollback = revertir el commit squash de OT-01. No habrá rollback de base de datos porque esta fase no debe contener cambios de DB.

## Resultado esperado de la fase

Al terminar OT-01, una persona que entre en IsiVoltPro OT debe percibir una aplicación profesional de órdenes de trabajo **multisector**, sin una navegación centrada en fotovoltaica ni identidad HomeServe, manteniendo intacto el núcleo operacional actual.
