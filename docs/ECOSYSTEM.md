# Ecosistema IsiVoltPro

## Visión

IsiVoltPro será la marca principal de una familia amplia de aplicaciones técnicas para mantenimiento, instalaciones e inspecciones.

La estrategia no consiste en convertir IsiVoltPro OT en un programa gigantesco. Cada producto debe resolver un trabajo concreto, mantener una interfaz clara y compartir datos comunes solo cuando resulte útil.

## Aplicación principal actual

### IsiVoltPro OT

Gestión completa de órdenes de trabajo:

- creación, planificación y asignación;
- aceptación y ejecución por el técnico;
- checklist, observaciones, mediciones, materiales, fotografías y firmas;
- bloqueo y reanudación;
- revisión administrativa;
- informe final y auditoría.

## Módulos previstos

1. **Activos QR / NFC**: identificación, historial, revisiones y documentación de equipos.
2. **Inventario y almacén**: materiales, herramientas, maletines, movimientos y existencias.
3. **Inspecciones eléctricas**: REBT, mediciones, defectos, fotografías, cálculos e informes.
4. **RITE y climatización**: mantenimiento, refrigeración, UTA, conductos, aerotermia y cálculos.
5. **PCI**: extintores, BIE, detección, grupos, rociadores y sistemas de protección.
6. **Legionella**: puntos de control, purgas, temperaturas, tratamientos, muestras y registros.
7. **Cálculos técnicos**: electricidad, climatización, refrigeración, hidráulica y utilidades rápidas.
8. **Informes y documentación**: plantillas, presupuestos, certificados, partes y archivo PDF.

## Datos compartidos

Cuando se implante la plataforma común, los módulos podrán compartir:

- identidad y acceso del usuario;
- organizaciones y permisos;
- clientes e instalaciones;
- ubicaciones y activos;
- técnicos y empresas externas;
- documentos, fotografías y auditoría.

Cada módulo conservará sus propias reglas de negocio y permisos específicos.

## Estructura recomendada de repositorios

- `isivoltpro-web`: portada pública, marca, catálogo y acceso a las aplicaciones.
- `isivoltpro-ot`: aplicación de órdenes de trabajo.
- `isivoltpro-activos`: activos, QR y NFC.
- `isivoltpro-inventario`: almacén, herramientas y movimientos.
- `isivoltpro-inspecciones`: inspecciones eléctricas y futuras especialidades.
- `isivoltpro-calculos`: calculadoras técnicas.

Al principio, los nuevos módulos pueden explorarse en ramas o prototipos. Cuando tengan alcance propio y despliegue independiente, deben separarse en su repositorio.

## Orden recomendado

1. Consolidar y publicar IsiVoltPro OT.
2. Crear la web principal `isivoltpro-web`.
3. Unificar identidad, organizaciones y navegación entre productos.
4. Desarrollar Activos QR / NFC e Inventario.
5. Incorporar Inspecciones, RITE, PCI, Legionella y Cálculos.
