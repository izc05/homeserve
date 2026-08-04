# Modelo multisector de IsiVoltPro OT

## Principio

IsiVoltPro OT gestiona mantenimiento de cualquier tipo de instalación técnica. La energía solar fotovoltaica es una especialidad más del catálogo y no condiciona la estructura general del producto.

## Jerarquía operativa

```text
Organización
└── Cliente
    └── Instalación o centro
        ├── Ubicaciones
        └── Sistemas técnicos
            ├── Activos y equipos
            ├── Checklist
            └── Órdenes de trabajo
```

Una instalación puede contener varios sistemas. Por ejemplo, un hospital puede disponer simultáneamente de baja tensión, climatización, PCI, fontanería, ACS, gases medicinales, telecomunicaciones, ascensores y automatización.

## Catálogo inicial

El catálogo normalizado incorpora 21 especialidades: general, electricidad BT, MT/AT, fotovoltaica, grupos y SAI, climatización, refrigeración, fontanería, ACS y Legionella, PCI, gases medicinales, electromedicina, ascensores, telecomunicaciones, seguridad, automatización, aire comprimido, vapor, obra civil, eficiencia energética y otras especialidades.

## Instalaciones

Cada instalación puede registrar:

- sector y uso principal;
- nivel de riesgo;
- ubicaciones físicas;
- varios sistemas técnicos;
- contacto, dirección, acceso, fotografías y documentación.

## Sistemas técnicos

Cada sistema técnico pertenece a una instalación e incorpora:

- especialidad normalizada;
- nombre y código;
- criticidad y estado;
- normativa aplicable;
- activos y órdenes relacionados.

Los sistemas utilizan baja lógica. No pueden eliminarse físicamente cuando conservan referencias históricas de activos u órdenes.

## Activos

Un activo puede vincularse a un sistema concreto y almacenar datos técnicos flexibles en JSON, además de marca, modelo, número de serie, referencia, estado, criticidad, normativa y fechas de revisión.

## Órdenes de trabajo

Al crear una OT se selecciona una especialidad y, opcionalmente, un sistema técnico. Cuando se elige un activo clasificado, la OT hereda su sistema. La base de datos rechaza combinaciones donde el activo no pertenezca al sistema elegido.

Las OT anteriores se conservan como `general` y no se modifican automáticamente, especialmente cuando ya están validadas o canceladas y son inmutables.

## Técnicos y checklist

Un técnico puede tener varias especialidades, una de ellas principal, y un nivel por especialidad. La interfaz señala técnicos compatibles sin impedir asignaciones de apoyo o empresas externas.

Las plantillas de checklist también quedan clasificadas por especialidad para ofrecer puntos distintos según electricidad, climatización, PCI, gases, fontanería u otros sistemas.

## Compatibilidad

- El flujo anterior continúa disponible para datos existentes.
- La nueva creación utiliza `create_work_order_v2`.
- RLS mantiene el aislamiento entre organizaciones.
- HomeServe OT Demo e IsiVoltPro OT comparten este mismo modelo funcional.

## Estado de implantación

- Esquema multisector aplicado en Supabase.
- Catálogo de especialidades centralizado en base de datos y frontend.
- Un sistema general creado para cada instalación existente.
- Formulario de OT preparado para especialidad, sistema y activo compatible.
- Técnicos preparados para varias especialidades.
- Datos y documentos históricos conservados sin alterar OT inmutables.
