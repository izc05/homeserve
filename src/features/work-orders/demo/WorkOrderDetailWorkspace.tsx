import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  History,
  ImagePlus,
  ListChecks,
  LockKeyhole,
  MapPin,
  Paperclip,
  Play,
  ShieldCheck,
  Upload,
  UserRound,
  Wrench,
} from 'lucide-react';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderStatus } from '../types/workOrder';

type DetailTab = 'detail' | 'tasks' | 'photos' | 'documents' | 'history';

type WorkOrderDetailWorkspaceProps = {
  order: WorkOrderListItem | null;
  viewerRole: string;
  demoMode: boolean;
  onBack: () => void;
  onDemoUpdate?: (orderId: string, changes: Partial<WorkOrderListItem>) => void;
};

const statusLabels: Record<WorkOrderStatus, string> = {
  BORRADOR: 'Borrador',
  ASIGNADA: 'Asignada',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  BLOQUEADA: 'Bloqueada',
  FINALIZADA_TECNICO: 'Pendiente validación',
  VALIDADA: 'Validada',
  CANCELADA: 'Cancelada',
};

const priorityLabels = {
  baja: 'Baja',
  normal: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
} as const;

const tabs: Array<{ id: DetailTab; label: string; icon: typeof FileText }> = [
  { id: 'detail', label: 'Detalle', icon: FileText },
  { id: 'tasks', label: 'Tareas', icon: ListChecks },
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'documents', label: 'Documentos', icon: Paperclip },
  { id: 'history', label: 'Historial', icon: History },
];

function displayDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusClass(status: WorkOrderStatus): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function priorityClass(priority: WorkOrderListItem['priority']): string {
  if (priority === 'normal') return 'priority-media';
  if (priority === 'urgente' || priority === 'critica') return 'priority-alta';
  return `priority-${priority}`;
}

function DetailContent({ order }: { order: WorkOrderListItem }) {
  return (
    <article className="panel detail-main-card detail-tab-panel">
      <div className="panel-heading">
        <h2>Información del trabajo</h2>
        <span className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</span>
      </div>
      <dl className="detail-definition-grid">
        <div><dt>Instalación</dt><dd>{order.siteName}</dd></div>
        <div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div>
        <div><dt>Tipo</dt><dd>{order.type.replaceAll('_', ' ')}</dd></div>
        <div><dt>Técnico asignado</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div>
        <div><dt>Fecha planificada</dt><dd>{displayDate(order.plannedAt)}</dd></div>
        <div><dt>Tiempo estimado</dt><dd>{order.estimatedMinutes ? `${order.estimatedMinutes} min` : 'No indicado'}</dd></div>
      </dl>
      <div className="description-box">
        <strong>Descripción</strong>
        <p>{order.description || 'Sin descripción registrada.'}</p>
      </div>
      {order.instructions && <div className="description-box soft"><strong>Instrucciones al técnico</strong><p>{order.instructions}</p></div>}
      {order.safetyNotes && <div className="description-box warning"><strong><ShieldCheck size={17} /> Riesgos y precauciones</strong><p>{order.safetyNotes}</p></div>}
      <div className="evidence-grid">
        <div><ListChecks size={22} /><strong>{order.requirements.checklist ? 'Checklist requerido' : 'Sin checklist'}</strong><small>Configuración de la OT</small></div>
        <div><Camera size={22} /><strong>{order.requirements.finalPhotos ? 'Fotos finales requeridas' : 'Fotos opcionales'}</strong><small>Evidencias visuales</small></div>
        <div><Clock3 size={22} /><strong>{order.dueAt ? displayDate(order.dueAt) : 'Sin fecha límite'}</strong><small>Vencimiento</small></div>
      </div>
    </article>
  );
}

function TasksContent({ order, demoMode }: { order: WorkOrderListItem; demoMode: boolean }) {
  const initialTasks = useMemo(() => [
    { id: 'safety', label: 'Revisar riesgos y aplicar medidas de seguridad', done: order.status !== 'BORRADOR' && order.status !== 'ASIGNADA' },
    { id: 'inspect', label: 'Inspeccionar la instalación y confirmar el alcance', done: ['EN_CURSO', 'BLOQUEADA', 'FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status) },
    { id: 'work', label: 'Ejecutar la intervención descrita en la OT', done: ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status) },
    { id: 'test', label: 'Realizar prueba funcional y mediciones finales', done: order.status === 'VALIDADA' },
    { id: 'report', label: 'Documentar resultado, materiales y observaciones', done: order.status === 'VALIDADA' },
  ], [order.status]);
  const [tasksState, setTasksState] = useState(initialTasks);

  useEffect(() => setTasksState(initialTasks), [initialTasks, order.id]);

  const completed = tasksState.filter((task) => task.done).length;
  return (
    <article className="panel detail-tab-panel task-panel">
      <div className="panel-heading">
        <div><h2>Checklist de ejecución</h2><small>{completed} de {tasksState.length} tareas completadas</small></div>
        <span className="source-badge">{demoMode ? 'Simulación local' : 'Solo lectura'}</span>
      </div>
      <div className="task-progress"><i style={{ width: `${Math.round((completed / tasksState.length) * 100)}%` }} /></div>
      <div className="task-list">
        {tasksState.map((task, index) => (
          <button
            className={task.done ? 'done' : ''}
            disabled={!demoMode}
            key={task.id}
            onClick={() => setTasksState((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
            type="button"
          >
            <span>{task.done ? <Check size={17} /> : index + 1}</span>
            <strong>{task.label}</strong>
            <small>{task.done ? 'Completada' : 'Pendiente'}</small>
          </button>
        ))}
      </div>
      {!demoMode && <p className="read-only-note"><LockKeyhole size={16} /> La edición se activará al conectar las operaciones seguras de Supabase.</p>}
    </article>
  );
}

function PhotosContent({ demoMode }: { demoMode: boolean }) {
  const [initialCount, setInitialCount] = useState(2);
  const [finalCount, setFinalCount] = useState(1);
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Evidencias fotográficas</h2><small>Ordenadas por momento de la intervención</small></div><span className="source-badge">{initialCount + finalCount} archivos</span></div>
      <div className="photo-groups">
        <section>
          <div className="photo-group-heading"><span><Camera size={19} /></span><div><strong>Estado inicial</strong><small>{initialCount} fotografías</small></div>{demoMode && <button onClick={() => setInitialCount((value) => value + 1)} type="button"><ImagePlus size={17} /> Añadir simulación</button>}</div>
          <div className="photo-placeholder-grid">{Array.from({ length: initialCount }, (_, index) => <div key={`initial-${index}`}><Camera size={25} /><span>Foto inicial {index + 1}</span></div>)}</div>
        </section>
        <section>
          <div className="photo-group-heading"><span><CheckCircle2 size={19} /></span><div><strong>Resultado final</strong><small>{finalCount} fotografías</small></div>{demoMode && <button onClick={() => setFinalCount((value) => value + 1)} type="button"><ImagePlus size={17} /> Añadir simulación</button>}</div>
          <div className="photo-placeholder-grid">{Array.from({ length: finalCount }, (_, index) => <div key={`final-${index}`}><CheckCircle2 size={25} /><span>Foto final {index + 1}</span></div>)}</div>
        </section>
      </div>
    </article>
  );
}

function DocumentsContent({ order, demoMode }: { order: WorkOrderListItem; demoMode: boolean }) {
  const documents = [
    { name: `Parte_${order.code}.pdf`, detail: 'Parte de trabajo · PDF', icon: FileText },
    { name: 'Mediciones_finales.xlsx', detail: 'Registro de medidas · Excel', icon: ClipboardCheck },
    { name: 'Manual_equipo.pdf', detail: 'Documentación técnica · PDF', icon: Wrench },
  ];
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Documentos asociados</h2><small>Partes, informes, manuales y certificados</small></div>{demoMode && <button className="secondary-button compact-button" type="button"><Upload size={16} /> Adjuntar simulación</button>}</div>
      <div className="document-list">
        {documents.map(({ name, detail, icon: Icon }) => <div key={name}><span><Icon size={21} /></span><div><strong>{name}</strong><small>{detail}</small></div><button aria-label={`Descargar ${name}`} type="button"><Download size={18} /></button></div>)}
      </div>
    </article>
  );
}

function HistoryContent({ order }: { order: WorkOrderListItem }) {
  const events = [
    { title: 'Orden creada', detail: 'Alta realizada por Administración', date: order.createdAt, icon: FileText },
    ...(order.assignedTo ? [{ title: `Asignada a ${order.assignedToName ?? 'técnico'}`, detail: 'Asignación de responsable', date: order.createdAt, icon: UserRound }] : []),
    ...(order.status === 'BLOQUEADA' ? [{ title: 'Trabajo bloqueado', detail: order.blockNotes ?? 'Pendiente de resolución', date: order.updatedAt, icon: AlertTriangle }] : []),
    { title: statusLabels[order.status], detail: 'Estado actual de la intervención', date: order.updatedAt, icon: History },
  ];
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Historial de actividad</h2><small>Trazabilidad cronológica de la OT</small></div><span className="source-badge">{events.length} eventos</span></div>
      <div className="history-list">
        {events.map(({ title, detail, date, icon: Icon }, index) => <div key={`${title}-${index}`}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{detail}</small></div><time>{displayDate(date)}</time></div>)}
      </div>
    </article>
  );
}

export default function WorkOrderDetailWorkspace({ order, viewerRole, demoMode, onBack, onDemoUpdate }: WorkOrderDetailWorkspaceProps) {
  const [tab, setTab] = useState<DetailTab>('detail');
  const canManage = viewerRole === 'admin_cliente' || viewerRole === 'coordinador';
  const isTechnician = viewerRole === 'tecnico' || viewerRole === 'tecnico_externo';

  useEffect(() => setTab('detail'), [order?.id]);

  if (!order) return <section className="panel data-state"><AlertTriangle size={28} /><strong>Orden no disponible</strong><p>Puede haber cambiado la organización activa o tus permisos.</p><button className="secondary-button" onClick={onBack} type="button">Volver</button></section>;

  const changeStatus = (status: WorkOrderStatus) => {
    if (!demoMode || !onDemoUpdate) return;
    onDemoUpdate(order.id, { status, updatedAt: new Date().toISOString() });
  };

  let content;
  if (tab === 'tasks') content = <TasksContent demoMode={demoMode} order={order} />;
  else if (tab === 'photos') content = <PhotosContent demoMode={demoMode} />;
  else if (tab === 'documents') content = <DocumentsContent demoMode={demoMode} order={order} />;
  else if (tab === 'history') content = <HistoryContent order={order} />;
  else content = <DetailContent order={order} />;

  return (
    <>
      {demoMode && <div className="demo-context-banner"><ShieldCheck size={17} /><span><strong>Modo demo:</strong> los cambios de esta pantalla son temporales y no llegan a Supabase.</span></div>}
      <div className="detail-header enhanced-detail-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={18} /> Volver</button>
        <div><span className="section-kicker">Orden de trabajo</span><h1>{order.code}</h1><p>{order.title}</p></div>
        <span className={statusClass(order.status)}>{statusLabels[order.status]}</span>
        <button className="filter-button detail-actions" type="button">Acciones <ChevronDown size={15} /></button>
      </div>
      <div className="detail-location-line"><MapPin size={16} /> {order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}</div>
      <div className="detail-tabs enhanced-tabs">
        {tabs.map(({ id, label, icon: Icon }) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)} type="button"><Icon size={16} /> {label}</button>)}
      </div>
      <section className="detail-grid enhanced-detail-grid">
        {content}
        <aside className="panel detail-side-card sticky-detail-side">
          <h2>Estado actual</h2>
          <div className="timeline">
            <div className="done"><i /><span><strong>OT creada</strong><small>{displayDate(order.createdAt)}</small></span></div>
            <div className={order.assignedTo ? 'done' : 'current'}><i /><span><strong>{order.assignedTo ? 'Técnico asignado' : 'Pendiente de asignación'}</strong><small>{order.assignedToName ?? 'Sin técnico'}</small></span></div>
            <div className="current"><i /><span><strong>{statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span></div>
          </div>

          {demoMode && (canManage || isTechnician) && <div className="demo-status-actions">
            <strong>Simular avance</strong>
            {order.status === 'ASIGNADA' && <button onClick={() => changeStatus('ACEPTADA')} type="button"><CheckCircle2 size={16} /> Aceptar OT</button>}
            {['ASIGNADA', 'ACEPTADA'].includes(order.status) && <button onClick={() => changeStatus('EN_CURSO')} type="button"><Play size={16} /> Iniciar trabajo</button>}
            {['ACEPTADA', 'EN_CURSO'].includes(order.status) && <button onClick={() => changeStatus('BLOQUEADA')} type="button"><AlertTriangle size={16} /> Bloquear</button>}
            {['EN_CURSO', 'BLOQUEADA'].includes(order.status) && <button onClick={() => changeStatus('FINALIZADA_TECNICO')} type="button"><ClipboardCheck size={16} /> Finalizar técnico</button>}
            {canManage && order.status === 'FINALIZADA_TECNICO' && <button className="validate" onClick={() => changeStatus('VALIDADA')} type="button"><Check size={16} /> Validar cierre</button>}
          </div>}

          {!demoMode && <p className="read-only-note"><LockKeyhole size={16} /> Vista de lectura. Las transiciones se activarán después de validar las RPC y las pruebas RLS.</p>}
          {demoMode && viewerRole === 'cliente_lectura' && <p className="read-only-note"><LockKeyhole size={16} /> Este perfil puede consultar, pero no simular cambios.</p>}
        </aside>
      </section>
    </>
  );
}
