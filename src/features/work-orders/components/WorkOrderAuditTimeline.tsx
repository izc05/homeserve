import {
  AlertOctagon,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  CircleDot,
  ClipboardPlus,
  Clock3,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  humanAuditAction,
  workOrderAuditDetail,
  workOrderAuditStateChange,
  workOrderAuditTone,
  type WorkOrderAuditEvent,
  type WorkOrderAuditTone,
} from '../api/workOrderAuditRepository';

type Props = {
  events: WorkOrderAuditEvent[];
  displayDate: (value: string | null) => string;
  limit?: number;
  empty?: string;
};

const icons: Record<WorkOrderAuditTone, typeof CircleDot> = {
  creation: ClipboardPlus,
  assignment: UserPlus,
  acceptance: UserCheck,
  start: PlayCircle,
  blocked: PauseCircle,
  resume: RefreshCw,
  complete: CheckCircle2,
  validation: CheckCircle2,
  rejected: Ban,
  reassignment: ArrowRightLeft,
  neutral: CircleDot,
};

function secondaryIcon(tone: WorkOrderAuditTone) {
  if (tone === 'blocked') return AlertOctagon;
  if (tone === 'rejected') return RotateCcw;
  return Clock3;
}

export default function WorkOrderAuditTimeline({ events, displayDate, limit, empty = 'No hay eventos visibles para esta OT.' }: Props) {
  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const visible = typeof limit === 'number' ? ordered.slice(-limit) : ordered;

  if (visible.length === 0) return <p className="empty-state">{empty}</p>;

  return <ol className="work-order-audit-timeline">
    {visible.map((event) => {
      const tone = workOrderAuditTone(event);
      const Icon = icons[tone];
      const AuxiliaryIcon = secondaryIcon(tone);
      const state = workOrderAuditStateChange(event);
      return <li className={`audit-timeline-event tone-${tone}`} key={event.id}>
        <span className="audit-timeline-marker" aria-hidden="true"><Icon size={18} /></span>
        <div className="audit-timeline-card">
          <header>
            <div><strong>{humanAuditAction(event.action)}</strong><span className="audit-tone-label">{tone === 'neutral' ? 'Evento registrado' : 'Cambio operativo'}</span></div>
            <time dateTime={event.createdAt}>{displayDate(event.createdAt)}</time>
          </header>
          <p>{workOrderAuditDetail(event)}</p>
          <footer>
            <span><AuxiliaryIcon size={15} /> {event.actorName ?? 'Sistema'}</span>
            {state.previous && state.next && <span className="audit-state-change"><b>{state.previous}</b><i>→</i><b>{state.next}</b></span>}
          </footer>
        </div>
      </li>;
    })}
  </ol>;
}
