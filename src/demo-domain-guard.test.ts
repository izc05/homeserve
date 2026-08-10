import { describe, expect, it } from 'vitest';
import appSource from './App.tsx?raw';
import demoAppSource from './DemoApp.tsx?raw';
import demoAccessSource from './features/demo/DemoAccessPanel.tsx?raw';
import demoModuleScreensSource from './features/demo/DemoModuleScreens.tsx?raw';
import demoPlanningSource from './features/demo/DemoPlanningScreen.tsx?raw';
import demoTechnicianSource from './features/demo/DemoTechnicianScreen.tsx?raw';
import demoCreateSource from './features/work-orders/demo/DemoCreateWorkOrder.tsx?raw';
import demoEditSource from './features/work-orders/demo/DemoEditWorkOrder.tsx?raw';
import demoDetailSource from './features/work-orders/demo/PersistentWorkOrderDetailWorkspace.tsx?raw';

const visibleOtSources = [
  appSource,
  demoAppSource,
  demoAccessSource,
  demoModuleScreensSource,
  demoPlanningSource,
  demoTechnicianSource,
  demoCreateSource,
  demoEditSource,
  demoDetailSource,
].join('\n');

const forbiddenVisiblePhrases = [
  'Equipos FV',
  'equipo FV',
  'Presentación FV',
  'presentación FV',
  'Fotovoltaica y mantenimiento',
  'fotovoltaica y mantenimiento',
  'Agenda FV',
  'Planificación FV',
  'planificación FV',
  'Jornada FV',
  'Jornada técnico FV',
  'mantenimiento FV',
  'Simulación FV',
  'Edición FV',
  'flujo móvil FV',
  'PARTE DE INTERVENCIÓN FV',
  'SolarManten FV',
];

describe('IsiVoltPro OT multisector domain guard', () => {
  it.each(forbiddenVisiblePhrases)('does not expose legacy sector phrase: %s', (phrase) => {
    expect(visibleOtSources).not.toContain(phrase);
  });

  it('keeps internal legacy demo identifiers outside this visible-text guard', () => {
    expect(demoCreateSource).toContain('demo-site-fv-jaen');
    expect(demoCreateSource).toContain('demo-location-fv-new');
  });
});
