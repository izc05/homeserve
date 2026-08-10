import { ClipboardList, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CreateWorkOrderFormValues } from '../forms/createWorkOrderSchema';
import CreateWorkOrderForm from './CreateWorkOrderForm';
import QuickCreateWorkOrderForm from './QuickCreateWorkOrderForm';

export type WorkOrderCreateMode = 'quick' | 'advanced';

type WorkOrderCreateWorkspaceProps = {
  tenantId: string;
  canManage: boolean;
  initialValues?: Partial<CreateWorkOrderFormValues>;
  onCancel: () => void;
  onCreated: (workOrderId: string, code: string, technicianName: string | null) => void;
};

export function initialWorkOrderCreateMode(
  initialValues?: Partial<CreateWorkOrderFormValues>,
): WorkOrderCreateMode {
  return initialValues && Object.keys(initialValues).length > 0 ? 'advanced' : 'quick';
}

export default function WorkOrderCreateWorkspace(props: WorkOrderCreateWorkspaceProps) {
  const { initialValues } = props;
  const [mode, setMode] = useState<WorkOrderCreateMode>(() => initialWorkOrderCreateMode(initialValues));

  useEffect(() => {
    setMode(initialWorkOrderCreateMode(initialValues));
  }, [initialValues]);

  return (
    <>
      <section className="panel source-panel" aria-label="Modo de creación de orden de trabajo">
        <div className="panel-heading">
          <div>
            <h2>Modo de alta</h2>
            <p>Usa Rápida para registrar una avería. Cambia a Avanzada cuando necesites asignar, planificar o configurar requisitos.</p>
          </div>
          <span className="source-badge">{mode === 'quick' ? 'Rápida' : 'Avanzada'}</span>
        </div>
        <div className="form-actions work-order-form-actions">
          <button
            aria-pressed={mode === 'quick'}
            className={mode === 'quick' ? 'primary-button' : 'secondary-button'}
            onClick={() => setMode('quick')}
            type="button"
          >
            <ClipboardList size={17} /> OT rápida
          </button>
          <button
            aria-pressed={mode === 'advanced'}
            className={mode === 'advanced' ? 'primary-button' : 'secondary-button'}
            onClick={() => setMode('advanced')}
            type="button"
          >
            <Settings2 size={17} /> OT avanzada
          </button>
        </div>
      </section>

      {mode === 'quick'
        ? <QuickCreateWorkOrderForm {...props} />
        : <CreateWorkOrderForm {...props} />}
    </>
  );
}
