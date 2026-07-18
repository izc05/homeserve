import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  ImagePlus,
  ListChecks,
  LockKeyhole,
  MapPin,
  Paperclip,
  Pencil,
  Play,
  Printer,
  ShieldCheck,
  Upload,
  Wrench,
} from 'lucide-react';
import type { DemoOrderMemory } from '../../demo/demoPersistence';
import type { WorkOrderListItem } from '../api/workOrdersRepository';
import type { WorkOrderStatus } from '../types/workOrder';
import TechnicianExecutionPanel from './TechnicianExecutionPanel';

type DetailTab = 'detail' | 'execution' | 'tasks' | 'photos' | 'documents' | 'history';

type Props = {
  order: WorkOrderListItem | null;
  viewerRole: string;
  memory: DemoOrderMemory | null;
  onBack: () => void;
  onEdit: () => void;
  onUpdateOrder: (changes: Partial<WorkOrderListItem>) => void;
  onUpdateMemory: (updater: (current: DemoOrderMemory) => DemoOrderMemory) => void;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
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

const priorityLabels: Record<WorkOrderListItem['priority'], string> = {
  baja: 'Baja',
  normal: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
  critica: 'Crítica',
};

const taskDefinitions = [
  { id: 'safety', label: 'Revisar riesgos y aplicar medidas de seguridad' },
  { id: 'inspect', label: 'Inspeccionar la instalación y confirmar el alcance' },
  { id: 'work', label: 'Ejecutar la intervención descrita en la OT' },
  { id: 'test', label: 'Realizar prueba funcional y mediciones finales' },
  { id: 'report', label: 'Documentar resultado, materiales y observaciones' },
] as const;

const tabs: Array<{ id: DetailTab; label: string; icon: typeof FileText }> = [
  { id: 'detail', label: 'Detalle', icon: FileText },
  { id: 'execution', label: 'Ejecución', icon: Wrench },
  { id: 'tasks', label: 'Tareas', icon: ListChecks },
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'documents', label: 'Documentos', icon: Paperclip },
  { id: 'history', label: 'Historial', icon: History },
];

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function displayDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':');
}

function statusClass(status: WorkOrderStatus): string {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

function priorityClass(priority: WorkOrderListItem['priority']): string {
  if (priority === 'normal') return 'priority-media';
  if (priority === 'urgente' || priority === 'critica') return 'priority-alta';
  return `priority-${priority}`;
}

function downloadDocument(name: string, order: WorkOrderListItem): void {
  const content = [
    'ISIVOLTPRO OT · DOCUMENTO DE DEMOSTRACIÓN',
    `Orden: ${order.code}`,
    `Título: ${order.title}`,
    `Instalación: ${order.siteName}`,
    `Ubicación: ${order.locationName ?? 'Sin ubicación'}`,
    `Estado: ${statusLabels[order.status]}`,
    '',
    'Este archivo se ha generado localmente para validar el flujo de trabajo.',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/\.pdf$/i, '.txt');
  link.click();
  URL.revokeObjectURL(url);
}

function addHistory(current: DemoOrderMemory, title: string, detail: string): DemoOrderMemory {
  return {
    ...current,
    history: [...current.history, { id: newId(), title, detail, date: new Date().toISOString() }],
  };
}

function DetailContent({ order }: { order: WorkOrderListItem }) {
  return (
    <article className="panel detail-main-card detail-tab-panel">
      <div className="panel-heading"><h2>Información del trabajo</h2><span className={`priority-badge ${priorityClass(order.priority)}`}>{priorityLabels[order.priority]}</span></div>
      <dl className="detail-definition-grid">
        <div><dt>Instalación</dt><dd>{order.siteName}</dd></div>
        <div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div>
        <div><dt>Equipo</dt><dd>{order.assetName ?? 'Sin equipo vinculado'}</dd></div>
        <div><dt>Tipo</dt><dd>{order.type.replaceAll('_', ' ')}</dd></div>
        <div><dt>Técnico asignado</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div>
        <div><dt>Fecha planificada</dt><dd>{displayDate(order.plannedAt)}</dd></div>
        <div><dt>Tiempo estimado</dt><dd>{order.estimatedMinutes ? `${order.estimatedMinutes} min` : 'No indicado'}</dd></div>
        <div><dt>Referencia activo</dt><dd>{order.assetReference ?? 'Sin referencia'}</dd></div>
      </dl>
      <div className="description-box"><strong>Descripción</strong><p>{order.description || 'Sin descripción registrada.'}</p></div>
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

function TasksContent({ memory, onUpdate }: { memory: DemoOrderMemory; onUpdate: Props['onUpdateMemory'] }) {
  const completed = taskDefinitions.filter((task) => memory.tasks[task.id]).length;
  return (
    <article className="panel detail-tab-panel task-panel">
      <div className="panel-heading"><div><h2>Checklist de ejecución</h2><small>{completed} de {taskDefinitions.length} tareas completadas</small></div><span className="source-badge">Funcional</span></div>
      <div className="task-progress"><i style={{ width: `${Math.round((completed / taskDefinitions.length) * 100)}%` }} /></div>
      <div className="task-list">
        {taskDefinitions.map((task, index) => {
          const done = Boolean(memory.tasks[task.id]);
          return <button className={done ? 'done' : ''} key={task.id} onClick={() => onUpdate((current) => addHistory({ ...current, tasks: { ...current.tasks, [task.id]: !done } }, done ? 'Tarea reabierta' : 'Tarea completada', task.label))} type="button"><span>{done ? <Check size={17} /> : index + 1}</span><strong>{task.label}</strong><small>{done ? 'Completada' : 'Pendiente'}</small></button>;
        })}
      </div>
    </article>
  );
}

function PhotosContent({ memory, onUpdate }: { memory: DemoOrderMemory; onUpdate: Props['onUpdateMemory'] }) {
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Evidencias fotográficas</h2><small>Alta rápida de evidencias para validar el flujo móvil</small></div><span className="source-badge">{memory.initialPhotos + memory.finalPhotos} archivos</span></div>
      <div className="photo-groups">
        <section>
          <div className="photo-group-heading"><span><Camera size={19} /></span><div><strong>Estado inicial</strong><small>{memory.initialPhotos} fotografías</small></div><button onClick={() => onUpdate((current) => addHistory({ ...current, initialPhotos: current.initialPhotos + 1 }, 'Foto inicial añadida', 'Evidencia inicial registrada.'))} type="button"><ImagePlus size={17} /> Añadir inicial</button></div>
          <div className="photo-placeholder-grid">{Array.from({ length: memory.initialPhotos }, (_, index) => <div key={`initial-${index}`}><Camera size={25} /><span>Foto inicial {index + 1}</span></div>)}</div>
        </section>
        <section>
          <div className="photo-group-heading"><span><CheckCircle2 size={19} /></span><div><strong>Resultado final</strong><small>{memory.finalPhotos} fotografías</small></div><button onClick={() => onUpdate((current) => addHistory({ ...current, finalPhotos: current.finalPhotos + 1 }, 'Foto final añadida', 'Evidencia final registrada.'))} type="button"><ImagePlus size={17} /> Añadir final</button></div>
          <div className="photo-placeholder-grid">{Array.from({ length: memory.finalPhotos }, (_, index) => <div key={`final-${index}`}><CheckCircle2 size={25} /><span>Foto final {index + 1}</span></div>)}</div>
        </section>
      </div>
    </article>
  );
}

function DocumentsContent({ order, memory, onUpdate }: { order: WorkOrderListItem; memory: DemoOrderMemory; onUpdate: Props['onUpdateMemory'] }) {
  const addDocument = () => onUpdate((current) => addHistory({ ...current, documents: [...current.documents, `Adjunto_${order.code}_${current.documents.length + 1}.pdf`] }, 'Documento adjuntado', 'Se ha añadido un documento a la OT.'));
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Documentos asociados</h2><small>Partes, informes, manuales y certificados</small></div><button className="secondary-button compact-button" onClick={addDocument} type="button"><Upload size={16} /> Adjuntar</button></div>
      <div className="document-list">
        {memory.documents.map((name) => <div key={name}><span><FileText size={21} /></span><div><strong>{name}</strong><small>Disponible para descarga de prueba</small></div><button aria-label={`Descargar ${name}`} onClick={() => downloadDocument(name, order)} type="button"><Download size={18} /></button></div>)}
      </div>
    </article>
  );
}

function HistoryContent({ memory }: { memory: DemoOrderMemory }) {
  return (
    <article className="panel detail-tab-panel">
      <div className="panel-heading"><div><h2>Historial de actividad</h2><small>Trazabilidad de acciones realizadas</small></div><span className="source-badge">{memory.history.length} eventos</span></div>
      <div className="history-list">{[...memory.history].reverse().map((event) => <div key={event.id}><span><History size={18} /></span><div><strong>{event.title}</strong><small>{event.detail}</small></div><time>{displayDate(event.date)}</time></div>)}</div>
    </article>
  );
}

function PrintReport({ order, memory }: { order: WorkOrderListItem; memory: DemoOrderMemory }) {
  const completed = taskDefinitions.filter((task) => memory.tasks[task.id]).length;
  const execution = memory.execution;
  return (
    <article className="demo-print-report">
      <header><div><strong>IsiVoltPro OT</strong><span>Parte de intervención · Demostración</span></div><b>{order.code}</b></header>
      <h1>{order.title}</h1>
      <dl><div><dt>Instalación</dt><dd>{order.siteName}</dd></div><div><dt>Ubicación</dt><dd>{order.locationName ?? 'Sin ubicación'}</dd></div><div><dt>Técnico</dt><dd>{order.assignedToName ?? 'Sin asignar'}</dd></div><div><dt>Estado</dt><dd>{statusLabels[order.status]}</dd></div><div><dt>Prioridad</dt><dd>{priorityLabels[order.priority]}</dd></div><div><dt>Fecha prevista</dt><dd>{displayDate(order.plannedAt)}</dd></div></dl>
      <section><h2>Descripción</h2><p>{order.description || 'Sin descripción registrada.'}</p></section>
      <section><h2>Resultado de la intervención</h2><p>{execution.observations || 'Sin observaciones registradas.'}</p></section>
      <section><h2>Resumen de ejecución</h2><p>Tiempo: {formatDuration(execution.accumulatedSeconds)} · {completed} de {taskDefinitions.length} tareas · {memory.initialPhotos} fotos iniciales · {memory.finalPhotos} fotos finales · {memory.documents.length} documentos.</p></section>
      {execution.materials.length > 0 && <section><h2>Materiales</h2><ul>{execution.materials.map((item) => <li key={item.id}>{item.name}: {item.quantity} {item.unit}</li>)}</ul></section>}
      {execution.measurements.length > 0 && <section><h2>Mediciones</h2><ul>{execution.measurements.map((item) => <li key={item.id}>{item.label}: {item.value}{item.unit ? ` ${item.unit}` : ''}</li>)}</ul></section>}
      <section className="print-signatures"><div><span>Firma técnico</span><strong>{execution.technicianSignature ?? 'Pendiente'}</strong></div><div><span>Firma responsable</span><strong>{execution.responsibleSignature ?? 'Pendiente'}</strong></div></section>
      <footer>Documento generado localmente para verificar el flujo.</footer>
    </article>
  );
}

export default function PersistentWorkOrderDetailWorkspace({ order, viewerRole, memory, onBack, onEdit, onUpdateOrder, onUpdateMemory, activeTab, onTabChange }: Props) {
  if (!order || !memory) return <section className="panel data-state"><AlertTriangle size={28} /><strong>Orden no disponible</strong><p>El registro puede haberse restablecido.</p><button className="secondary-button" onClick={onBack} type="button">Volver</button></section>;

  const canManage = viewerRole === 'admin_cliente' || viewerRole === 'coordinador';
  const isTechnician = viewerRole === 'tecnico' || viewerRole === 'tecnico_externo';
  const canMove = canManage || isTechnician;
  const setStatus = (status: WorkOrderStatus, title: string, detail: string) => {
    onUpdateOrder({ status, updatedAt: new Date().toISOString(), blockReason: status === 'BLOQUEADA' ? 'OTRO' : order.blockReason, blockNotes: status === 'BLOQUEADA' ? 'Bloqueo registrado desde demo.' : order.blockNotes });
    onUpdateMemory((current) => addHistory(current, title, detail));
  };
  const finishOrder = () => {
    const now = new Date().toISOString();
    onUpdateOrder({ status: 'FINALIZADA_TECNICO', updatedAt: now });
    onUpdateMemory((current) => addHistory({
      ...current,
      tasks: { safety: true, inspect: true, work: true, test: true, report: true },
      finalPhotos: Math.max(current.finalPhotos, order.requirements.finalPhotos ? 1 : current.finalPhotos),
      documents: current.documents.includes(`Parte_${order.code}.pdf`) ? current.documents : [...current.documents, `Parte_${order.code}.pdf`],
      execution: {
        ...current.execution,
        accumulatedSeconds: Math.max(current.execution.accumulatedSeconds, (order.estimatedMinutes ?? 30) * 60),
        observations: current.execution.observations || 'Intervención finalizada correctamente. Pendiente de validación responsable.',
        technicianSignature: current.execution.technicianSignature ?? order.assignedToName ?? 'Técnico demo',
        completedAt: now,
      },
    }, 'Intervención finalizada', 'La OT queda pendiente de validación responsable.'));
    onTabChange('history');
  };

  let content;
  if (activeTab === 'execution') content = <TechnicianExecutionPanel memory={memory} onAddHistory={(title, detail) => onUpdateMemory((current) => addHistory(current, title, detail))} onUpdateMemory={onUpdateMemory} onUpdateOrder={onUpdateOrder} order={order} viewerRole={viewerRole} />;
  else if (activeTab === 'tasks') content = <TasksContent memory={memory} onUpdate={onUpdateMemory} />;
  else if (activeTab === 'photos') content = <PhotosContent memory={memory} onUpdate={onUpdateMemory} />;
  else if (activeTab === 'documents') content = <DocumentsContent memory={memory} onUpdate={onUpdateMemory} order={order} />;
  else if (activeTab === 'history') content = <HistoryContent memory={memory} />;
  else content = <DetailContent order={order} />;

  return (
    <>
      <div className="demo-context-banner"><ShieldCheck size={17} /><span><strong>Modo demo operativo:</strong> pestañas, acciones, documentos, fotos e historial funcionan en este navegador.</span></div>
      <div className="detail-header enhanced-detail-header">
        <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={18} /> Volver</button>
        <div><span className="section-kicker">Orden de trabajo</span><h1>{order.code}</h1><p>{order.title}</p></div>
        <span className={statusClass(order.status)}>{statusLabels[order.status]}</span>
        <div className="demo-detail-toolbar"><button className="filter-button" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir parte</button>{canManage && <button className="filter-button" onClick={onEdit} type="button"><Pencil size={16} /> Editar</button>}</div>
      </div>
      <div className="detail-location-line"><MapPin size={16} /> {order.siteName}{order.locationName ? ` · ${order.locationName}` : ''}</div>
      <div className="detail-tabs enhanced-tabs">{tabs.map(({ id, label, icon: Icon }) => <button aria-current={activeTab === id ? 'page' : undefined} className={activeTab === id ? 'active' : ''} key={id} onClick={() => onTabChange(id)} type="button"><Icon size={16} /> {label}</button>)}</div>
      {canMove && <article className="panel demo-action-strip"><strong>Acciones rápidas</strong><div>{order.status === 'ASIGNADA' && <button onClick={() => setStatus('ACEPTADA', 'OT aceptada', `Cambio realizado por ${viewerRole}.`)} type="button"><CheckCircle2 size={16} /> Aceptar</button>}{['ASIGNADA', 'ACEPTADA'].includes(order.status) && <button onClick={() => setStatus('EN_CURSO', 'Trabajo iniciado', `Inicio realizado por ${viewerRole}.`)} type="button"><Play size={16} /> Iniciar</button>}{['ACEPTADA', 'EN_CURSO'].includes(order.status) && <button onClick={() => setStatus('BLOQUEADA', 'OT bloqueada', 'Se registra una parada temporal.')} type="button"><AlertTriangle size={16} /> Bloquear</button>}{order.status === 'BLOQUEADA' && <button onClick={() => setStatus('EN_CURSO', 'OT reanudada', 'La intervención vuelve a estar en curso.')} type="button"><Play size={16} /> Reanudar</button>}{['EN_CURSO', 'BLOQUEADA'].includes(order.status) && <button className="validate" onClick={finishOrder} type="button"><Check size={16} /> Finalizar técnico</button>}{canManage && order.status === 'FINALIZADA_TECNICO' && <button className="validate" onClick={() => { setStatus('VALIDADA', 'OT validada', 'Cierre validado por responsable.'); onUpdateMemory((current) => ({ ...addHistory(current, 'Histórico actualizado', 'La OT queda lista para histórico del activo.'), execution: { ...current.execution, responsibleSignature: current.execution.responsibleSignature ?? 'Responsable demo' } })); }} type="button"><ShieldCheck size={16} /> Validar cierre</button>}</div></article>}
      <section className="detail-grid enhanced-detail-grid">
        {content}
        <aside className="panel detail-side-card sticky-detail-side">
          <h2>Estado actual</h2>
          <div className="timeline"><div className="done"><i /><span><strong>OT creada</strong><small>{displayDate(order.createdAt)}</small></span></div><div className={order.assignedTo ? 'done' : 'current'}><i /><span><strong>{order.assignedTo ? 'Técnico asignado' : 'Pendiente de asignación'}</strong><small>{order.assignedToName ?? 'Sin técnico'}</small></span></div><div className="current"><i /><span><strong>{statusLabels[order.status]}</strong><small>Actualizada {displayDate(order.updatedAt)}</small></span></div></div>
          <div className="demo-status-actions"><strong>Atajos</strong><button onClick={() => onTabChange('execution')} type="button"><Wrench size={16} /> Ejecución</button><button onClick={() => onTabChange('tasks')} type="button"><ListChecks size={16} /> Checklist</button><button onClick={() => onTabChange('documents')} type="button"><FileText size={16} /> Documentos</button></div>
          {viewerRole === 'cliente_lectura' && <p className="read-only-note"><LockKeyhole size={16} /> Este perfil puede consultar e imprimir, pero no editar ni simular cambios.</p>}
        </aside>
      </section>
      <PrintReport memory={memory} order={order} />
    </>
  );
}
