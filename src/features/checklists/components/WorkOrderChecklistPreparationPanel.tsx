import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import { listWorkOrderChecklist } from '../../work-orders/api/workOrderExecutionRepository';
import { listChecklistTemplates, prepareChecklistFromTemplate } from '../api/checklistTemplateRepository';
import type { WorkOrderStatus } from '../../work-orders/types/workOrder';

type Props = {
  tenantId: string;
  workOrderId: string;
  status: WorkOrderStatus;
};

function message(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : 'No se pudo preparar el checklist.';
}
export default function WorkOrderChecklistPreparationPanel({ tenantId, workOrderId, status }: Props) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState('');
  const templatesKey = useMemo(() => ['checklist-templates', tenantId], [tenantId]);
  const checklistKey = useMemo(() => ['work-order-checklist', workOrderId], [workOrderId]);
  const templatesQuery = useQuery({
    queryKey: templatesKey,
    queryFn: () => listChecklistTemplates(getSupabaseClient(), tenantId),
    enabled: Boolean(tenantId),
  });
  const checklistQuery = useQuery({
    queryKey: checklistKey,
    queryFn: () => listWorkOrderChecklist(getSupabaseClient(), workOrderId),
    enabled: Boolean(workOrderId),
  });
  const prepareMutation = useMutation({
    mutationFn: () => prepareChecklistFromTemplate(getSupabaseClient(), workOrderId, templateId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: checklistKey }),
        queryClient.invalidateQueries({ queryKey: ['work-orders', tenantId] }),
      ]);
    },
  });

  const activeTemplates = (templatesQuery.data ?? []).filter((template) => template.active);
  const checklist = checklistQuery.data ?? [];
  const canPrepare = ['BORRADOR', 'ASIGNADA', 'ACEPTADA'].includes(status);

  return <article className="panel checklist-preparation-panel">
    <div className="panel-heading"><div><h2><ClipboardCheck size={20} /> Preparación del checklist</h2><p>La versión elegida se copia a la OT y queda aislada de futuras ediciones.</p></div>{checklist.length > 0 && <span className="source-badge"><CheckCircle2 size={14} /> {checklist.length} puntos</span>}</div>
    {(templatesQuery.isLoading || checklistQuery.isLoading) && <p className="read-only-note"><LoaderCircle className="spin" size={16} /> Consultando checklist y plantillas…</p>}
    {(templatesQuery.error || checklistQuery.error) && <p className="form-global-error" role="alert"><AlertTriangle size={16} /> No se pudo consultar la preparación del checklist.</p>}
    {!templatesQuery.isLoading && !checklistQuery.isLoading && checklist.length > 0 && <p className="read-only-note"><CheckCircle2 size={16} /> El checklist ya está preparado. No se sustituirá para conservar su versión histórica.</p>}
    {!templatesQuery.isLoading && !checklistQuery.isLoading && checklist.length === 0 && !canPrepare && <p className="read-only-note">La intervención ya ha comenzado. El técnico puede preparar únicamente el checklist legacy compatible si la OT aún no tiene puntos.</p>}
    {!templatesQuery.isLoading && !checklistQuery.isLoading && checklist.length === 0 && canPrepare && activeTemplates.length === 0 && <p className="read-only-note">No hay plantillas activas. Créala o actívala desde Configuración.</p>}
    {!templatesQuery.isLoading && !checklistQuery.isLoading && checklist.length === 0 && canPrepare && activeTemplates.length > 0 && <div className="checklist-preparation-actions"><label><span>Plantilla activa</span><select onChange={(event) => setTemplateId(event.target.value)} value={templateId}><option value="">Selecciona una plantilla</option>{activeTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label><button className="primary-button" disabled={!templateId || prepareMutation.isPending} onClick={() => { const template = activeTemplates.find((item) => item.id === templateId); if (template && window.confirm(`¿Preparar esta OT con “${template.name}” v${template.version}? La instantánea no podrá sustituirse después.`)) prepareMutation.mutate(); }} type="button">{prepareMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <ClipboardCheck size={17} />} Preparar checklist</button></div>}
    {prepareMutation.error && <p className="form-global-error" role="alert"><AlertTriangle size={16} /> {message(prepareMutation.error)}</p>}
    {prepareMutation.isSuccess && <p className="read-only-note"><CheckCircle2 size={16} /> Checklist versionado preparado correctamente.</p>}
  </article>;
}
