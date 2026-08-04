import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileClock,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  generateWorkOrderReport,
  listWorkOrderReports,
  loadWorkOrderReportCapabilities,
  safeReportError,
  type WorkOrderReport,
  type WorkOrderReportType,
} from '../api/workOrderReportRepository';
import './WorkOrderReportsPanel.css';

export type WorkOrderReportsPanelProps = {
  workOrderId: string;
  client?: SupabaseClient;
};

function displayDate(value: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function displayBytes(value: number | null) {
  if (!value || value < 1) return 'Tamaño pendiente';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function reportLabel(report: WorkOrderReport) {
  return report.type === 'final' ? 'Informe final' : 'Informe provisional';
}

function statusLabel(report: WorkOrderReport) {
  if (report.status === 'ready') return 'Disponible';
  if (report.status === 'failed') return 'Fallido';
  return 'Generando';
}

function ReportStatusIcon({ report }: { report: WorkOrderReport }) {
  if (report.status === 'ready') return <CheckCircle2 size={19} aria-hidden="true" />;
  if (report.status === 'failed') return <AlertTriangle size={19} aria-hidden="true" />;
  return <LoaderCircle className="spin" size={19} aria-hidden="true" />;
}

export default function WorkOrderReportsPanel({ workOrderId, client }: WorkOrderReportsPanelProps) {
  const supabase = client ?? getSupabaseClient();
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['work-order-reports', workOrderId],
    queryFn: () => listWorkOrderReports(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });
  const capabilitiesQuery = useQuery({
    queryKey: ['work-order-report-capabilities', workOrderId],
    queryFn: () => loadWorkOrderReportCapabilities(supabase, workOrderId),
    enabled: Boolean(workOrderId),
  });

  const mutation = useMutation({
    mutationFn: (reportType: WorkOrderReportType) => generateWorkOrderReport(supabase, { workOrderId, reportType }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-order-reports', workOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-report-capabilities', workOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-completion-support', workOrderId] }),
        queryClient.invalidateQueries({ queryKey: ['work-order-audit'] }),
      ]);
    },
  });

  const reports = reportsQuery.data ?? [];
  const capabilities = capabilitiesQuery.data;
  const isLoading = reportsQuery.isLoading || capabilitiesQuery.isLoading;
  const hasError = reportsQuery.error || capabilitiesQuery.error;
  const canGenerate = Boolean(capabilities?.canGenerateProvisional || capabilities?.canGenerateFinal);

  const refresh = async () => {
    await Promise.all([reportsQuery.refetch(), capabilitiesQuery.refetch()]);
  };

  return <section className="execution-card report-panel" aria-labelledby={`reports-title-${workOrderId}`}>
    <div className="execution-card-heading">
      <div className="execution-card-title">
        <span className="execution-card-icon" aria-hidden="true"><FileCheck2 size={20} /></span>
        <div><h2 id={`reports-title-${workOrderId}`}>Informes PDF</h2><p>Histórico privado, versionado y protegido contra sobrescrituras.</p></div>
      </div>
      <span className="private-evidence-badge"><ShieldCheck size={14} aria-hidden="true" /> Versionado</span>
    </div>

    {isLoading && <div className="execution-loading"><LoaderCircle className="spin" size={20} /> Cargando informes…</div>}
    {hasError && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> No se pudo cargar el histórico de informes.</p>}

    {!isLoading && !hasError && reports.length === 0 && <div className="report-empty-state">
      <FileText size={24} aria-hidden="true" />
      <strong>Sin informes generados</strong>
      <p>La primera versión se podrá crear cuando finalice la intervención técnica.</p>
    </div>}

    {reports.length > 0 && <div className="report-version-list" aria-label="Versiones del informe">
      {reports.map((report) => <article className={`report-version is-${report.status} is-${report.type}`} key={report.id}>
        <span className="report-version-icon"><ReportStatusIcon report={report} /></span>
        <div className="report-version-content">
          <div className="report-version-heading"><strong>{reportLabel(report)} · v{report.version}</strong><span>{statusLabel(report)}</span></div>
          <p>{report.filename}</p>
          <small>{displayDate(report.completedAt ?? report.generatedAt)} · {displayBytes(report.sizeBytes)}</small>
          {report.checksumSha256 && <small className="report-checksum" title={report.checksumSha256}>SHA-256 · {report.checksumSha256.slice(0, 16)}…</small>}
          {report.failureReason && <small className="report-failure">{report.failureReason}</small>}
        </div>
        <div className="report-version-actions">
          {report.signedUrl && <a className="secondary-button report-download" href={report.signedUrl} rel="noopener noreferrer" target="_blank"><Download size={16} /> Abrir PDF</a>}
          {report.status === 'generating' && <span className="report-generating"><FileClock size={15} /> Procesando</span>}
        </div>
      </article>)}
    </div>}

    {mutation.error && <p className="execution-inline-error" role="alert"><AlertTriangle size={17} /> {safeReportError(mutation.error)}</p>}
    {mutation.isSuccess && <p className="completion-success" role="status"><CheckCircle2 size={17} /> Informe generado y guardado como una nueva versión privada.</p>}

    {!isLoading && !hasError && <div className="report-panel-actions">
      {capabilities?.canGenerateProvisional && <button className="primary-button" disabled={mutation.isPending} onClick={() => mutation.mutate('provisional')} type="button">
        {mutation.isPending ? <LoaderCircle className="spin" size={17} /> : <FileText size={17} />} {mutation.isPending ? 'Generando…' : 'Generar informe provisional'}
      </button>}
      {capabilities?.canGenerateFinal && <button className="primary-button" disabled={mutation.isPending} onClick={() => mutation.mutate('final')} type="button">
        {mutation.isPending ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />} {mutation.isPending ? 'Generando…' : 'Generar informe final'}
      </button>}
      {!canGenerate && capabilities?.finalReportExists && <span className="report-final-locked"><ShieldCheck size={16} /> Informe final inmutable</span>}
      <button className="secondary-button" disabled={reportsQuery.isFetching || capabilitiesQuery.isFetching || mutation.isPending} onClick={() => void refresh()} type="button"><RefreshCw className={reportsQuery.isFetching ? 'spin' : ''} size={16} /> Actualizar</button>
    </div>}

    {capabilities?.workOrderStatus === 'FINALIZADA_TECNICO' && <p className="report-guidance"><FileClock size={16} /> El provisional refleja la intervención antes de la validación administrativa.</p>}
    {capabilities?.workOrderStatus === 'VALIDADA' && !capabilities.finalReportExists && <p className="report-guidance"><ShieldCheck size={16} /> El responsable puede crear una única versión final e inmutable.</p>}
  </section>;
}
