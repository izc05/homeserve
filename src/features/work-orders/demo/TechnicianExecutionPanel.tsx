import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  ClipboardCheck,
  Gauge,
  MaterialSymbol,
  Pause,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  Save,
  TimerReset,
  Trash2,
} from 'lucide-react';
import type {
  DemoMaterialEntry,
  DemoMeasurementEntry,
  DemoOrderMemory,
} from '../../demo/demoPersistence';
import type { WorkOrderListItem } from '../api/workOrdersRepository';

// Lucide does not expose a dedicated material icon in every version.
const MaterialIcon = MaterialSymbol ?? ClipboardCheck;

type Props = {
  order: WorkOrderListItem;
  viewerRole: string;
  memory: DemoOrderMemory;
  onUpdateOrder: (changes: Partial<WorkOrderListItem>) => void;
  onUpdateMemory: (updater: (current: DemoOrderMemory) => DemoOrderMemory) => void;
  onAddHistory: (title: string, detail: string) => void;
};

const taskIds = ['safety', 'inspect', 'work', 'test', 'report'] as const;

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':');
}

function activeElapsed(runningSince: string | null, accumulatedSeconds: number, now: number): number {
  if (!runningSince) return accumulatedSeconds;
  return accumulatedSeconds + Math.max(0, Math.floor((now - new Date(runningSince).getTime()) / 1000));
}

export default function TechnicianExecutionPanel({
  order,
  viewerRole,
  memory,
  onUpdateOrder,
  onUpdateMemory,
  onAddHistory,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [materialName, setMaterialName] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('1');
  const [materialUnit, setMaterialUnit] = useState('ud');
  const [measurementLabel, setMeasurementLabel] = useState('');
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('V');
  const [signatureName, setSignatureName] = useState(order.assignedToName ?? '');
  const [responsibleName, setResponsibleName] = useState('');

  const execution = memory.execution;
  const canManage = viewerRole === 'admin_cliente' || viewerRole === 'coordinador';
  const isTechnician = viewerRole === 'tecnico' || viewerRole === 'tecnico_externo';
  const canExecute = canManage || isTechnician;
  const elapsed = activeElapsed(execution.runningSince, execution.accumulatedSeconds, now);
  const completedTasks = taskIds.filter((id) => memory.tasks[id]).length;

  useEffect(() => {
    if (!execution.runningSince) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [execution.runningSince]);

  const completionChecks = useMemo(() => [
    { label: 'Checklist completado', passed: completedTasks === taskIds.length },
    { label: 'Fotos finales registradas', passed: !order.requirements.finalPhotos || memory.finalPhotos > 0 },
    { label: 'Firma del técnico', passed: Boolean(execution.technicianSignature) },
    { label: 'Cronómetro detenido', passed: !execution.runningSince },
  ], [completedTasks, execution.runningSince, execution.technicianSignature, memory.finalPhotos, order.requirements.finalPhotos]);

  const canFinish = completionChecks.every((item) => item.passed)
    && !['FINALIZADA_TECNICO', 'VALIDADA', 'CANCELADA'].includes(order.status);

  const startTimer = () => {
    if (!canExecute || execution.runningSince || ['BORRADOR', 'CANCELADA', 'VALIDADA'].includes(order.status)) return;
    const startedAt = new Date().toISOString();
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, runningSince: startedAt },
    }));
    if (['ASIGNADA', 'ACEPTADA', 'BLOQUEADA'].includes(order.status)) {
      onUpdateOrder({ status: 'EN_CURSO', updatedAt: startedAt, blockReason: null, blockNotes: null });
    }
    onAddHistory(execution.accumulatedSeconds > 0 ? 'Trabajo reanudado' : 'Trabajo iniciado', 'Cronómetro iniciado desde la vista técnica.');
  };

  const pauseTimer = () => {
    if (!execution.runningSince) return;
    const stoppedAt = Date.now();
    const seconds = activeElapsed(execution.runningSince, execution.accumulatedSeconds, stoppedAt);
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, runningSince: null, accumulatedSeconds: seconds },
    }));
    setNow(stoppedAt);
    onAddHistory('Trabajo pausado', `Tiempo acumulado: ${formatDuration(seconds)}.`);
  };

  const resetTimer = () => {
    if (!canExecute || !window.confirm('¿Reiniciar el tiempo registrado en esta OT?')) return;
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, runningSince: null, accumulatedSeconds: 0 },
    }));
    setNow(Date.now());
    onAddHistory('Cronómetro reiniciado', 'Se eliminó el tiempo acumulado de la simulación.');
  };

  const addMaterial = () => {
    const name = materialName.trim();
    const quantity = Number(materialQuantity);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return;
    const entry: DemoMaterialEntry = {
      id: crypto.randomUUID(),
      name,
      quantity,
      unit: materialUnit.trim() || 'ud',
    };
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, materials: [...current.execution.materials, entry] },
    }));
    setMaterialName('');
    setMaterialQuantity('1');
    onAddHistory('Material registrado', `${entry.quantity} ${entry.unit} · ${entry.name}.`);
  };

  const addMeasurement = () => {
    const label = measurementLabel.trim();
    const value = measurementValue.trim();
    if (!label || !value) return;
    const entry: DemoMeasurementEntry = {
      id: crypto.randomUUID(),
      label,
      value,
      unit: measurementUnit.trim(),
    };
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, measurements: [...current.execution.measurements, entry] },
    }));
    setMeasurementLabel('');
    setMeasurementValue('');
    onAddHistory('Medición registrada', `${entry.label}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}.`);
  };

  const removeMaterial = (id: string) => onUpdateMemory((current) => ({
    ...current,
    execution: {
      ...current.execution,
      materials: current.execution.materials.filter((item) => item.id !== id),
    },
  }));

  const removeMeasurement = (id: string) => onUpdateMemory((current) => ({
    ...current,
    execution: {
      ...current.execution,
      measurements: current.execution.measurements.filter((item) => item.id !== id),
    },
  }));

  const signTechnician = () => {
    const name = signatureName.trim();
    if (!name || !canExecute) return;
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, technicianSignature: name },
    }));
    onAddHistory('Firma del técnico', `Parte firmado por ${name}.`);
  };

  const signResponsible = () => {
    const name = responsibleName.trim();
    if (!name || !canManage) return;
    onUpdateMemory((current) => ({
      ...current,
      execution: { ...current.execution, responsibleSignature: name },
    }));
    onAddHistory('Firma responsable', `Revisión firmada por ${name}.`);
  };

  const finishWork = () => {
    if (!canFinish) return;
    const completedAt = new Date().toISOString();
    onUpdateMemory((current) => ({
      ...current,
      tasks: { ...current.tasks, work: true, report: true },
      execution: { ...current.execution, completedAt },
    }));
    onUpdateOrder({ status: 'FINALIZADA_TECNICO', updatedAt: completedAt });
    onAddHistory('Intervención finalizada', `Tiempo total registrado: ${formatDuration(elapsed)}. Pendiente de validación.`);
  };

  return (
    <article className="panel detail-tab-panel technician-execution-panel">
      <div className="panel-heading execution-heading">
        <div><h2>Ejecución de la intervención</h2><small>Registro local de tiempo, materiales, mediciones y firmas</small></div>
        <span className={`execution-live-badge ${execution.runningSince ? 'running' : ''}`}><Activity size={15} /> {execution.runningSince ? 'En marcha' : 'Detenido'}</span>
      </div>

      <section className="execution-timer-card">
        <div><TimerReset size={28} /><span><small>Tiempo registrado</small><strong>{formatDuration(elapsed)}</strong></span></div>
        <div className="execution-timer-actions">
          {!execution.runningSince ? <button className="primary-button" disabled={!canExecute || ['BORRADOR', 'CANCELADA', 'VALIDADA'].includes(order.status)} onClick={startTimer} type="button"><Play size={17} /> {execution.accumulatedSeconds ? 'Reanudar' : 'Iniciar'}</button> : <button className="primary-button" onClick={pauseTimer} type="button"><Pause size={17} /> Pausar</button>}
          <button className="secondary-button" disabled={!canExecute} onClick={resetTimer} type="button"><RotateCcw size={16} /> Reiniciar</button>
        </div>
      </section>

      <div className="execution-columns">
        <section className="execution-block">
          <div className="execution-block-title"><MaterialIcon size={19} /><span><strong>Materiales utilizados</strong><small>{execution.materials.length} registros</small></span></div>
          {canExecute && <div className="execution-inline-form material-form"><input onChange={(event) => setMaterialName(event.target.value)} placeholder="Material o repuesto" value={materialName} /><input min="0.01" onChange={(event) => setMaterialQuantity(event.target.value)} step="0.01" type="number" value={materialQuantity} /><input onChange={(event) => setMaterialUnit(event.target.value)} value={materialUnit} /><button aria-label="Añadir material" onClick={addMaterial} type="button"><Plus size={17} /></button></div>}
          <div className="execution-record-list">{execution.materials.length === 0 ? <p>Sin materiales registrados.</p> : execution.materials.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.quantity} {item.unit}</small></span>{canExecute && <button aria-label={`Eliminar ${item.name}`} onClick={() => removeMaterial(item.id)} type="button"><Trash2 size={15} /></button>}</div>)}</div>
        </section>

        <section className="execution-block">
          <div className="execution-block-title"><Gauge size={19} /><span><strong>Mediciones</strong><small>{execution.measurements.length} registros</small></span></div>
          {canExecute && <div className="execution-inline-form measurement-form"><input onChange={(event) => setMeasurementLabel(event.target.value)} placeholder="Magnitud" value={measurementLabel} /><input onChange={(event) => setMeasurementValue(event.target.value)} placeholder="Valor" value={measurementValue} /><input onChange={(event) => setMeasurementUnit(event.target.value)} value={measurementUnit} /><button aria-label="Añadir medición" onClick={addMeasurement} type="button"><Plus size={17} /></button></div>}
          <div className="execution-record-list">{execution.measurements.length === 0 ? <p>Sin mediciones registradas.</p> : execution.measurements.map((item) => <div key={item.id}><span><strong>{item.label}</strong><small>{item.value}{item.unit ? ` ${item.unit}` : ''}</small></span>{canExecute && <button aria-label={`Eliminar ${item.label}`} onClick={() => removeMeasurement(item.id)} type="button"><Trash2 size={15} /></button>}</div>)}</div>
        </section>
      </div>

      <section className="execution-block execution-observations">
        <div className="execution-block-title"><ClipboardCheck size={19} /><span><strong>Observaciones y resultado</strong><small>Texto incluido en el parte imprimible</small></span></div>
        <textarea disabled={!canExecute} onChange={(event) => onUpdateMemory((current) => ({ ...current, execution: { ...current.execution, observations: event.target.value } }))} placeholder="Describe la intervención realizada, pruebas, incidencias y resultado final…" rows={5} value={execution.observations} />
      </section>

      <section className="execution-signatures">
        <div><PenLine size={20} /><strong>Firma del técnico</strong>{execution.technicianSignature ? <span className="signature-complete"><Check size={16} /> {execution.technicianSignature}</span> : <div><input disabled={!canExecute} onChange={(event) => setSignatureName(event.target.value)} placeholder="Nombre del técnico" value={signatureName} /><button disabled={!canExecute || !signatureName.trim()} onClick={signTechnician} type="button"><Save size={16} /> Firmar</button></div>}</div>
        <div><PenLine size={20} /><strong>Firma responsable</strong>{execution.responsibleSignature ? <span className="signature-complete"><Check size={16} /> {execution.responsibleSignature}</span> : canManage ? <div><input onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nombre del responsable" value={responsibleName} /><button disabled={!responsibleName.trim()} onClick={signResponsible} type="button"><Save size={16} /> Firmar</button></div> : <small>Pendiente de revisión administrativa</small>}</div>
      </section>

      <section className="execution-completion-card">
        <div><strong>Requisitos para finalizar</strong><div>{completionChecks.map((item) => <span className={item.passed ? 'passed' : ''} key={item.label}>{item.passed ? <Check size={15} /> : <AlertTriangle size={15} />}{item.label}</span>)}</div></div>
        <button className="primary-button" disabled={!canExecute || !canFinish} onClick={finishWork} type="button"><ClipboardCheck size={18} /> Finalizar intervención</button>
      </section>
    </article>
  );
}
