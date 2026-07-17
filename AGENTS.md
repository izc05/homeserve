# AGENTS.md

Normas comunes para Claude, Codex y cualquier agente de desarrollo.

## Alcance fijo

El producto gestiona órdenes de trabajo. No añadir módulos generales salvo que sean imprescindibles para crear o ejecutar una OT.

## Forma de trabajar

- Revisar documentación antes de tocar código.
- Proponer cambios pequeños y comprobables.
- Una funcionalidad por rama o PR.
- No reescribir archivos completos sin necesidad.
- No cambiar estados, roles ni modelo sin documentarlo.
- No modificar una migración ya aplicada; crear otra.
- Añadir pruebas junto con la funcionalidad.
- Mantener textos visibles en español.
- Explicar cualquier paso manual de Supabase o despliegue.

## Calidad mínima

Antes de cerrar una tarea:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Cuando exista Playwright:

```bash
npm run test:e2e
```

## Seguridad

- RLS activado en tablas con datos de usuario.
- El técnico solo accede a su OT asignada.
- Las operaciones sensibles se validan en servidor/base de datos.
- Nada de secretos en commits.
- Storage privado para fotos, firmas e informes.
- Auditoría para asignar, aceptar, iniciar, bloquear, finalizar, corregir, validar, cancelar y reabrir.

## Pull requests

Cada PR debe indicar:

- objetivo;
- archivos y migraciones;
- permisos afectados;
- pruebas ejecutadas;
- pasos manuales;
- capturas cuando cambie interfaz;
- riesgos y retrocompatibilidad.

## Prohibiciones

- No trabajar directamente con datos reales.
- No crear usuarios demo con contraseñas públicas.
- No dejar `TODO` críticos sin issue.
- No ocultar errores con `catch` vacíos.
- No usar almacenamiento local como fuente oficial.
- No publicar APK antes de validar la PWA.
