import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CirclePlay,
  ClipboardList,
  Clock3,
  FileCheck2,
  Flag,
  History,
  Info,
  MapPin,
  Plus,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { WorkOrderPriority, WorkOrderStatus } from '../types/workOrder';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import { humanAuditAction, workOrderAuditDetail, type WorkOrderAuditEvent } from '../api/workOrderAuditRepository';
import { DemoBrandFooter } from '../../../components/ProductBrand';
import { workOrderDirectionsUrl } from '../domain/workOrderDirections';

export type PremiumWorkOrderDetailProps = {
  order: WorkOrderListItem;
  auditEvents: WorkOrderAuditEvent[];
  back: () => void;
  onNewRelated: () => void;
  statusLabel: string;
  priorityLabel: string;
  typeLabel: string;
  displayDate: (value: string | null) => string;
  statusClass: (status: WorkOrderStatus) => string;
  priorityClass: (priority: WorkOrderPriority) => string;
  operationalPanels?: {
    assignment?: ReactNode;
    technical?: ReactNode;
    evidence?: ReactNode;
    review?: ReactNode;
    cancel?: ReactNode;
  };
};

type TabId = 'summary' | 'history' | 'installation' | 'evidence' | 'administration';

const tabs: Array<{ id: TabId; label: string; icon: typeof ClipboardList }> = [
  { id: 'summary', label: 'Resumen', icon: ClipboardList },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'installation', label: 'Instalación', icon: Building2 },
  { id: 'evidence', label: 'Evidencias', icon: FileCheck2 },
  { id: 'administration', label: 'Administración', icon: Settings2 },
];

function initials(value: string | null | undefined) {
  const name = value?.trim();
  if (!name) return '—';
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function elapsedLabel(from: string | null) {
  if (!from) return 'Sin dato';
  const elapsed = Math.max(0, Date.now() - new Date(from).getTime());
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function statusIcon(status: WorkOrderStatus) {
  if (status === 'EN_CURSO' || status === 'ACEPTADA') return <CirclePlay size={17} aria-hidden="true" />;
  if (status === 'VALIDADA' || status === 'FINALIZADA_TECNICO') return <CheckCircle2 size={17} aria-hidden="true" />;
  if (status === 'BLOQUEADA' || status === 'CANCELADA') return <AlertTriangle size={17} aria-hidden="true" />;
  return <Clock3 size={17} aria-hidden="true" />;
}

function Field({ label, value, empty = false }: { label: string; value: ReactNode; empty?: boolean }) {
  return <div className="premium-field"><dt>{label}</dt><dd className={empty ? 'is-empty' : undefined}>{value}</dd></div>;
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Clock3; label: string; value: string; hint: string }) {
  return <div className="premium-kpi"><span className="premium-kpi-icon" aria-hidden="true"><Icon size={21} /></span><div><span className="premium-kpi-label">{label}</span><strong>{value}</strong><small>{hint}</small></div></div>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <span className="premium-empty"><Info size={15} aria-hidden="true" />{children}</span>;
}

function AuditTimeline({ events, displayDate, compact = false }: { events: WorkOrderAuditEvent[]; displayDate: (value: string | null) => string; compact?: boolean }) {
  if (events.length === 0) return <div className="premium-empty-card"><Info size={20} /><strong>No hay eventos visibles para esta OT.</strong><p>La auditoría aparecerá aquí cuando exista una actuación registrada.</p></div>;
  return <div className={`premium-timeline ${compact ? 'premium-timeline-compact' : ''}`}>
    {events.map((event) => <div className="premium-timeline-item" key={event.id}>
      <span className="premium-timeline-dot" aria-hidden="true"><CheckCircle2 size={14} /></span>
      <div><strong>{humanAuditAction(event.action)}</strong><span>{workOrderAuditDetail(event)}</span><small>{event.actorName ?? 'Sistema'} · {displayDate(event.createdAt)}</small></div>
    </div>)}
  </div>;
}

function ReadOnlyPanel({ title, children, icon: Icon }: { title: string; children: ReactNode; icon: typeof Building2 }) {
  return <section className="premium-readonly-panel"><div className="premium-section-heading"><span className="premium-section-icon"><Icon size={18} /></span><h3>{title}</h3></div>{children}</section>;
}

export default function PremiumWorkOrderDetail({
  order,
  auditEvents,
  back,
  onNewRelated,
  statusLabel,
  priorityLabel,
  typeLabel,
  displayDate,
  statusClass,
  priorityClass,
  operationalPanels,
}: PremiumWorkOrderDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const orderAudit = useMemo(() => auditEvents.filter((event) => event.entityId === order.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [auditEvents, order.id]);
  const currentStateEvent = [...orderAudit].reverse().find((event) => String(event.metadata.estado_nuevo ?? '') === order.status);
  const required = Object.entries(order.requirements).filter(([, value]) => value).map(([key]) => key.replaceAll(/([A-Z])/g, ' $1').toLowerCase());
  const nextAction = order.status === 'BORRADOR' ? 'Asignar un técnico' : order.status === 'ASIGNADA' ? 'El técnico debe aceptar' : order.status === 'ACEPTADA' ? 'Iniciar intervención' : order.status === 'EN_CURSO' ? 'Completar ejecución' : order.status === 'BLOQUEADA' ? 'Resolver bloqueo' : order.status === 'FINALIZADA_TECNICO' ? 'Validación administrativa' : 'Sin acciones pendientes';
  const tabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    const focusNextTab = () => document.getElementById(`premium-tab-${tabs[nextIndex].id}`)?.focus();
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focusNextTab);
    else window.setTimeout(focusNextTab, 0);
  };

  const statusBadgeClass = `${statusClass(order.status)} premium-status-badge`;
  const priorityBadgeClass = `priority-badge ${priorityClass(order.priority)} premium-priority-badge`;
  const directionsUrl = workOrderDirectionsUrl({ address: order.siteAddress });

  return <article className="premium-work-order-page">
    <header className="premium-record-header">
      <div className="premium-record-header-inner">
        <button className="premium-back-button" onClick={back} type="button"><ArrowLeft size={18} /> Volver</button>
        <div className="premium-record-title"><span className="premium-kicker">Orden real</span><h1>{order.code}</h1><p>{order.title}</p></div>
        <div className="premium-record-actions"><span className={statusBadgeClass}>{statusIcon(order.status)}<span>{statusLabel}</span></span><span className={priorityBadgeClass}><Flag size={15} aria-hidden="true" />{priorityLabel}</span><button className="primary-button premium-related-button" onClick={onNewRelated} type="button"><Plus size={17} /> Nueva relacionada</button></div>
      </div>
    </header>

    <div className="premium-work-order-content">
      <section className="premium-kpi-strip" aria-label="Indicadores de la orden">
        <Kpi icon={Clock3} label="Antigüedad" value={elapsedLabel(order.createdAt)} hint={`Desde ${displayDate(order.createdAt)}`} />
        <Kpi icon={Clock3} label="Tiempo en estado" value={elapsedLabel(currentStateEvent?.createdAt ?? order.updatedAt)} hint={currentStateEvent ? `Desde ${displayDate(currentStateEvent.createdAt)}` : 'Desde última actualización'} />
        <Kpi icon={CalendarDays} label="Planificada" value={order.plannedAt ? displayDate(order.plannedAt) : 'Sin planificar'} hint={order.plannedAt ? 'Fecha prevista' : 'No hay fecha prevista'} />
        <Kpi icon={CalendarDays} label="Fecha límite" value={order.dueAt ? displayDate(order.dueAt) : 'Sin planificar'} hint={order.dueAt ? 'Vencimiento' : 'No hay fecha límite'} />
      </section>

      <section className="premium-next-action" aria-labelledby="premium-next-action-title">
        <span className="premium-next-icon"><Flag size={24} /></span>
        <div><span className="premium-kicker">Próxima actuación</span><h2 id="premium-next-action-title">{nextAction}</h2><p>{nextAction === 'Completar ejecución' ? 'La finalización real requiere el flujo operativo existente; esta ficha solo muestra la siguiente actuación.' : 'Siguiente paso disponible según el estado actual de la orden.'}</p></div>
        <button className="secondary-button premium-history-button" onClick={() => setActiveTab('history')} type="button"><History size={17} /> Ver historial</button>
      </section>

      <div className="premium-tab-nav" role="tablist" aria-label="Secciones de la ficha de OT">
        {tabs.map(({ id, label, icon: Icon }) => <button className={`premium-tab ${activeTab === id ? 'is-active' : ''}`} id={`premium-tab-${id}`} key={id} onClick={() => setActiveTab(id)} onKeyDown={onTabKeyDown} role="tab" aria-controls={`premium-panel-${id}`} aria-selected={activeTab === id} tabIndex={activeTab === id ? 0 : -1} type="button"><Icon size={17} aria-hidden="true" /><span>{label}</span></button>)}
      </div>

      <div className="premium-tab-panel" id={`premium-panel-${activeTab}`} role="tabpanel" aria-labelledby={`premium-tab-${activeTab}`} tabIndex={0}>
        {activeTab === 'summary' && <>
          <section className="premium-summary-grid">
            <ReadOnlyPanel icon={ClipboardList} title="Información del trabajo"><dl className="premium-fields-grid"><Field label="Cliente" value={order.clientName ?? <EmptyState>Sin cliente</EmptyState>} empty={!order.clientName} /><Field label="Tipo" value={typeLabel} /><Field label="Siguiente acción" value={nextAction} /><Field label="Descripción" value={order.description || <EmptyState>Sin descripción registrada.</EmptyState>} empty={!order.description} /><Field label="Instrucciones" value={order.instructions || <EmptyState>Sin instrucciones adicionales.</EmptyState>} empty={!order.instructions} /><Field label="Riesgos y precauciones" value={order.safetyNotes || <EmptyState>Sin riesgos registrados.</EmptyState>} empty={!order.safetyNotes} /></dl></ReadOnlyPanel>
            <ReadOnlyPanel icon={Building2} title="Contexto de instalación y técnico"><dl className="premium-fields-grid"><Field label="Instalación" value={order.siteName || <EmptyState>Sin instalación</EmptyState>} /><Field label="Ubicación" value={order.siteAddress || order.locationName || <span><span className="premium-pending-badge">Ubicación pendiente</span><small className="premium-subvalue">Sin dirección ni coordenadas</small></span>} empty={!order.siteAddress && !order.locationName} /><Field label="Equipo" value={order.assetName ?? <EmptyState>Sin equipo vinculado</EmptyState>} empty={!order.assetName} /><Field label="Técnico asignado" value={order.assignedToName ? <span className="premium-technician"><span className="premium-avatar">{initials(order.assignedToName)}</span><span><strong>{order.assignedToName}</strong><small>Contacto no disponible en los datos visibles</small></span></span> : <EmptyState>Sin técnico asignado</EmptyState>} empty={!order.assignedToName} /></dl></ReadOnlyPanel>
          </section>
          <ReadOnlyPanel icon={History} title="Historial reciente"><AuditTimeline events={orderAudit.slice(0, 4)} displayDate={displayDate} compact /></ReadOnlyPanel>
          <section className="premium-requirements" aria-label="Requisitos de la orden"><div className="premium-section-heading"><span className="premium-section-icon"><ShieldCheck size={18} /></span><h3>Requisitos registrados</h3></div><div className="premium-requirement-grid"><div><ListIcon checked={order.requirements.checklist} /><strong>{order.requirements.checklist ? 'Checklist requerido' : 'Checklist no obligatorio'}</strong><small>{required.length ? required.join(' · ') : 'Sin requisitos especiales'}</small></div><div><ListIcon checked={order.requirements.report} /><strong>{order.requirements.report ? 'Informe requerido' : 'Informe opcional'}</strong><small>Registro documental</small></div><div><ListIcon checked={Boolean(order.dueAt)} /><strong>{order.dueAt ? 'Fecha límite registrada' : 'Sin fecha límite'}</strong><small>{order.dueAt ? displayDate(order.dueAt) : 'No disponible'}</small></div></div></section>
          {(operationalPanels?.assignment || operationalPanels?.technical || operationalPanels?.cancel) && <section className="premium-operational-panels"><div className="premium-section-heading"><span className="premium-section-icon"><Wrench size={18} /></span><h3>Controles operativos existentes</h3></div>{operationalPanels.assignment}{operationalPanels.technical}{operationalPanels.cancel}</section>}
        </>}
        {activeTab === 'history' && <ReadOnlyPanel icon={History} title="Historial cronológico"><AuditTimeline events={orderAudit} displayDate={displayDate} /></ReadOnlyPanel>}
        {activeTab === 'installation' && <section className="premium-installation-grid"><ReadOnlyPanel icon={Building2} title="Instalación"><dl className="premium-fields-grid"><Field label="Nombre" value={order.siteName || <EmptyState>Sin instalación</EmptyState>} /><Field label="Dirección" value={order.siteAddress || <EmptyState>Ubicación pendiente</EmptyState>} empty={!order.siteAddress} /><Field label="Ubicación interior" value={order.locationName || <EmptyState>Sin ubicación interior registrada.</EmptyState>} empty={!order.locationName} /><Field label="Equipo" value={order.assetName || <EmptyState>Sin equipo vinculado</EmptyState>} empty={!order.assetName} /><Field label="Cómo llegar" value={directionsUrl ? <a className="premium-directions-link" href={directionsUrl} rel="noopener noreferrer" target="_blank"><MapPin size={16} /> Abrir indicaciones</a> : <EmptyState>Ubicación pendiente</EmptyState>} empty={!directionsUrl} /></dl></ReadOnlyPanel><ReadOnlyPanel icon={MapPin} title="Acceso y contacto">{order.siteContactName || order.siteContactPhone || order.siteContactEmail ? <dl className="premium-fields-grid"><Field label="Contacto" value={order.siteContactName || <EmptyState>Sin nombre</EmptyState>} empty={!order.siteContactName} /><Field label="Teléfono" value={order.siteContactPhone || <EmptyState>Sin teléfono</EmptyState>} empty={!order.siteContactPhone} /><Field label="Correo" value={order.siteContactEmail || <EmptyState>Sin correo</EmptyState>} empty={!order.siteContactEmail} /></dl> : <div className="premium-empty-card"><MapPin size={20} /><strong>Contacto pendiente</strong><p>No hay contacto responsable ni instrucciones adicionales disponibles para esta instalación.</p></div>}</ReadOnlyPanel></section>}
        {activeTab === 'evidence' && <>{operationalPanels?.evidence ?? <ReadOnlyPanel icon={FileCheck2} title="Evidencias"><div className="premium-empty-card"><FileCheck2 size={20} /><strong>Sin evidencias visibles</strong><p>El checklist, las fotografías privadas y el resumen técnico aparecerán aquí cuando estén registrados.</p></div></ReadOnlyPanel>}</>}
        {activeTab === 'administration' && <><ReadOnlyPanel icon={Settings2} title="Administración"><dl className="premium-fields-grid premium-admin-fields"><Field label="Código" value={order.code} /><Field label="Estado" value={<span className={statusBadgeClass}>{statusIcon(order.status)}{statusLabel}</span>} /><Field label="Prioridad" value={<span className={priorityBadgeClass}><Flag size={14} />{priorityLabel}</span>} /><Field label="Creada" value={displayDate(order.createdAt)} /><Field label="Última actualización" value={displayDate(order.updatedAt)} /><Field label="Responsable de creación" value={<EmptyState>Nombre no disponible en la OT visible.</EmptyState>} empty /></dl></ReadOnlyPanel>{operationalPanels?.review}</>}
      </div>
    </div>
    <DemoBrandFooter className="premium-brand-footer" />
  </article>;
}

function ListIcon({ checked }: { checked: boolean }) {
  return checked ? <CheckCircle2 size={20} aria-label="Sí" /> : <Info size={20} aria-label="No" />;
}
