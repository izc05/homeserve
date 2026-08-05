import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, ClipboardList, Download, FileClock, FileText, Filter, Search, ShieldAlert } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';
import type { WorkOrderListItem } from '../../work-orders/api/workOrdersRepository';
import type { WorkOrderStatus } from '../../work-orders/types/workOrder';

type Props = {
  orders: WorkOrderListItem[];
  open: (id: string) => void;
};

type ReportRow = {
  id: string;
  ot_id: string;
  version: number;
  filename: string;
  bucket: string | null;
  path: string | null;
  created_at: string;
};

const statusLabels: Record<WorkOrderStatus, string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente de validación',
  VALIDADA: 'Validada',
  CANCELADA: 'Cancelada',
};

function statusClass(status: WorkOrderStatus) {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function displayDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function withinDays(value: string, days: number) {
  return Date.now() - new Date(value).getTime() <= days * 86_400_000;
}

export default function ReportsWorkspace({ orders, open }: Props) {
  const supabase = getSupabaseClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | WorkOrderStatus>('todos');
  const [client, setClient] = useState('todos');
  const [technician, setTechnician] = useState('todos');
  const [period, setPeriod] = useState<'todos' | '7' | '30' | '90'>('todos');

  const reportCandidates = useMemo(
    () => orders.filter((order) => order.requirements.report || ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status)),
    [orders],
  );
  const orderIds = useMemo(() => reportCandidates.map((order) => order.id), [reportCandidates]);
  const reportsQuery = useQuery({
    queryKey: ['work-order-reports', orderIds.join(',')],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_informes')
        .select('id,ot_id,version,filename,bucket,path,created_at')
        .in('ot_id', orderIds)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const latestReportByOrder = useMemo(() => {
    const map = new Map<string, ReportRow>();
    for (const report of reportsQuery.data ?? []) {
      if (!map.has(report.ot_id)) map.set(report.ot_id, report);
    }
    return map;
  }, [reportsQuery.data]);

  const clients = useMemo(() => [...new Set(reportCandidates.map((order) => order.clientName).filter((value): value is string => Boolean(value)))].sort(), [reportCandidates]);
  const technicians = useMemo(() => [...new Set(reportCandidates.map((order) => order.assignedToName).filter((value): value is string => Boolean(value)))].sort(), [reportCandidates]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-ES');
    const days = period === 'todos' ? null : Number(period);
    return reportCandidates.filter((order) => {
      if (status !== 'todos' && order.status !== status) return false;
      if (client !== 'todos' && order.clientName !== client) return false;
      if (technician !== 'todos' && order.assignedToName !== technician) return false;
      if (days && !withinDays(order.updatedAt, days)) return false;
      if (!term) return true;
      return [order.code, order.title, order.clientName, order.siteName, order.assignedToName]
        .some((value) => value?.toLocaleLowerCase('es-ES').includes(term));
    });
  }, [client, period, reportCandidates, search, status, technician]);

  const openOrders = reportCandidates.filter((order) => !['VALIDADA', 'CANCELADA'].includes(order.status)).length;
  const generated = latestReportByOrder.size;
  const pendingValidation = reportCandidates.filter((order) => order.status === 'FINALIZADA_TECNICO').length;
  const incomplete = reportCandidates.filter((order) => order.status === 'BLOQUEADA' || (order.requirements.report && !latestReportByOrder.has(order.id))).length;

  const download = async (report: ReportRow) => {
    if (!report.path) return;
    const { data, error } = await supabase.storage.from(report.bucket || 'ot-reports').createSignedUrl(report.path, 60);
    if (!error && data.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return <section className="reports-workspace">
    <header className="reports-header">
      <div><span className="section-kicker">Documentación operativa</span><h1>Informes</h1><p>Consulta el estado documental de cada OT y accede a sus evidencias sin perder el contexto técnico.</p></div>
      <button className="primary-button" disabled title="Generación PDF en desarrollo" type="button"><FileText size={18} /> Generar informe</button>
    </header>

    <div className="reports-development-note"><FileClock size={17} /><span><strong>Generación PDF en desarrollo</strong> Las OT y su documentación siguen disponibles para consulta.</span></div>

    <section className="reports-summary" aria-label="Resumen de informes">
      <article><ClipboardList size={21} /><span><strong>{openOrders}</strong><small>OT abiertas</small></span></article>
      <article><CheckCircle2 size={21} /><span><strong>{generated}</strong><small>Informes generados</small></span></article>
      <article><FileClock size={21} /><span><strong>{pendingValidation}</strong><small>Pendientes de validación</small></span></article>
      <article><ShieldAlert size={21} /><span><strong>{incomplete}</strong><small>Bloqueadas o incompletas</small></span></article>
    </section>

    <section className="panel reports-panel">
      <div className="reports-filters">
        <label className="reports-search"><Search size={17} /><input aria-label="Buscar informes" onChange={(event) => setSearch(event.target.value)} placeholder="Código, título, cliente, instalación o técnico" value={search} /></label>
        <label><span>Estado</span><select onChange={(event) => setStatus(event.target.value as 'todos' | WorkOrderStatus)} value={status}><option value="todos">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Cliente</span><select onChange={(event) => setClient(event.target.value)} value={client}><option value="todos">Todos</option>{clients.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Técnico</span><select onChange={(event) => setTechnician(event.target.value)} value={technician}><option value="todos">Todos</option>{technicians.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Actualización</span><select onChange={(event) => setPeriod(event.target.value as typeof period)} value={period}><option value="todos">Cualquier fecha</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></label>
        <span className="reports-result-count"><Filter size={15} /> {filtered.length} resultados</span>
      </div>

      <div className="reports-table" role="table" aria-label="Listado de informes">
        <div className="reports-row reports-row-head" role="row"><span>Código OT</span><span>Trabajo</span><span>Cliente e instalación</span><span>Técnico</span><span>Estado OT</span><span>Documentación</span><span>Actualización</span><span>Acciones</span></div>
        {filtered.length === 0 ? <p className="empty-state">No hay informes que coincidan con los filtros.</p> : filtered.map((order) => {
          const report = latestReportByOrder.get(order.id);
          const documentStatus = report ? `Generado · v${report.version}` : order.status === 'FINALIZADA_TECNICO' ? 'Pendiente de validación' : 'Documentación pendiente';
          return <article className="reports-row" key={order.id} role="row">
            <strong data-label="Código OT">{order.code}</strong>
            <span data-label="Trabajo"><b>{order.title}</b></span>
            <span data-label="Cliente e instalación"><b>{order.clientName || 'Sin cliente'}</b><small>{order.siteName}</small></span>
            <span data-label="Técnico">{order.assignedToName || 'Sin asignar'}</span>
            <span data-label="Estado OT"><i className={statusClass(order.status)}>{statusLabels[order.status]}</i></span>
            <span data-label="Documentación" className={report ? 'report-document-ready' : 'report-document-pending'}>{documentStatus}</span>
            <span data-label="Actualización"><CalendarDays size={15} /> {displayDate(order.updatedAt)}</span>
            <span data-label="Acciones" className="reports-actions"><button className="text-link" onClick={() => open(order.id)} type="button">Abrir OT</button><button className="text-link" onClick={() => open(order.id)} type="button">Ver documentación</button><button className="text-link" disabled title="Generación PDF en desarrollo" type="button">Generar</button>{report?.path ? <button className="text-link" onClick={() => void download(report)} type="button"><Download size={15} /> PDF</button> : <button className="text-link" disabled type="button"><Download size={15} /> PDF</button>}</span>
          </article>;
        })}
      </div>
    </section>
  </section>;
}
