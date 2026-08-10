import { describe, expect, it } from 'vitest';
import appSource from '../../../App.tsx?raw';
import advancedSource from './CreateWorkOrderForm.tsx?raw';
import quickSource from './QuickCreateWorkOrderForm.tsx?raw';
import workspaceSource from './WorkOrderCreateWorkspace.tsx?raw';

const forbiddenAdvancedPhrases = [
  'Alta rápida de instalación FV',
  'Cubierta FV edificio A',
  'FV-CUB-001',
  "type: 'fotovoltaica'",
  'placeholder="fotovoltaica"',
  'Inversor FV 50 kW',
  'inversor_fotovoltaico',
  'INV-FV-001',
  'Revisar inversor FV de cubierta',
] as const;

describe('work-order creation domain guard', () => {
  it.each(forbiddenAdvancedPhrases)('does not expose legacy photovoltaic phrase: %s', (phrase) => {
    expect(advancedSource).not.toContain(phrase);
  });

  it('keeps the quick creation promise visible', () => {
    expect(quickSource).toContain('Nueva OT rápida');
    expect(quickSource).toContain('Activo no obligatorio');
    expect(quickSource).toContain('Sin activo identificado');
    expect(quickSource).toContain('Crear OT rápida');
  });

  it('keeps both quick and advanced modes available', () => {
    expect(workspaceSource).toContain("type WorkOrderCreateMode = 'quick' | 'advanced'");
    expect(workspaceSource).toContain('OT rápida');
    expect(workspaceSource).toContain('OT avanzada');
  });

  it('routes App creation through the workspace', () => {
    expect(appSource).toContain("import CreateWorkOrderForm from './features/work-orders/components/WorkOrderCreateWorkspace';");
    expect(appSource).not.toContain("import CreateWorkOrderForm from './features/work-orders/components/CreateWorkOrderForm';");
  });
});
