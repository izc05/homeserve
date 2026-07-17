import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export type DemoTaskState = Record<string, boolean>;

export type DemoHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
};

export type DemoMaterialEntry = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

export type DemoMeasurementEntry = {
  id: string;
  label: string;
  value: string;
  unit: string;
};

export type DemoExecutionState = {
  runningSince: string | null;
  accumulatedSeconds: number;
  materials: DemoMaterialEntry[];
  measurements: DemoMeasurementEntry[];
  observations: string;
  technicianSignature: string | null;
  responsibleSignature: string | null;
  completedAt: string | null;
};

export type DemoOrderMemory = {
  tasks: DemoTaskState;
  initialPhotos: number;
  finalPhotos: number;
  documents: string[];
  history: DemoHistoryEntry[];
  execution: DemoExecutionState;
};

export type DemoPersistedState = {
  version: 2;
  orders: WorkOrderListItem[];
  memory: Record<string, DemoOrderMemory>;
};

type LegacyDemoOrderMemory = Omit<DemoOrderMemory, 'execution'>;
type LegacyDemoPersistedState = {
  version: 1;
  orders: WorkOrderListItem[];
  memory: Record<string, LegacyDemoOrderMemory>;
};

export const DEMO_STORAGE_KEY = 'isivoltpro.demo.v1';

const taskDefaults = {
  safety: false,
  inspect: false,
  work: false,
  test: false,
  report: false,
} satisfies DemoTaskState;

export function createDefaultExecutionState(): DemoExecutionState {
  return {
    runningSince: null,
    accumulatedSeconds: 0,
    materials: [],
    measurements: [],
    observations: '',
    technicianSignature: null,
    responsibleSignature: null,
    completedAt: null,
  };
}

export function createDefaultOrderMemory(order: WorkOrderListItem): DemoOrderMemory {
  const progressed = !['BORRADOR', 'ASIGNADA'].includes(order.status);
  const executing = ['EN_CURSO', 'BLOQUEADA', 'FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status);
  const finished = ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status);
  const validated = order.status === 'VALIDADA';

  return {
    tasks: {
      ...taskDefaults,
      safety: progressed,
      inspect: executing,
      work: finished,
      test: validated,
      report: validated,
    },
    initialPhotos: order.requirements.initialPhotos ? 2 : 0,
    finalPhotos: finished && order.requirements.finalPhotos ? 1 : 0,
    documents: [`Parte_${order.code}.pdf`],
    history: [
      {
        id: `${order.id}-created`,
        title: 'Orden creada',
        detail: 'Alta realizada en la demostración',
        date: order.createdAt,
      },
    ],
    execution: {
      ...createDefaultExecutionState(),
      accumulatedSeconds: finished ? Math.max((order.estimatedMinutes ?? 60) * 60, 60) : 0,
      observations: finished ? 'Intervención completada y comprobada en modo demostración.' : '',
      technicianSignature: finished ? order.assignedToName ?? 'Técnico demo' : null,
      completedAt: finished ? order.updatedAt : null,
      responsibleSignature: validated ? 'Responsable demo' : null,
    },
  };
}

export function createInitialDemoState(orders: WorkOrderListItem[]): DemoPersistedState {
  return {
    version: 2,
    orders,
    memory: Object.fromEntries(orders.map((order) => [order.id, createDefaultOrderMemory(order)])),
  };
}

function isWorkOrderArray(value: unknown): value is WorkOrderListItem[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<WorkOrderListItem>;
    return typeof candidate.id === 'string'
      && typeof candidate.code === 'string'
      && typeof candidate.title === 'string'
      && typeof candidate.status === 'string';
  });
}

function migrateLegacyState(state: LegacyDemoPersistedState): DemoPersistedState {
  const memory = Object.fromEntries(state.orders.map((order) => {
    const legacy = state.memory[order.id];
    const fallback = createDefaultOrderMemory(order);
    return [order.id, {
      ...fallback,
      ...legacy,
      tasks: { ...fallback.tasks, ...(legacy?.tasks ?? {}) },
      documents: legacy?.documents ?? fallback.documents,
      history: legacy?.history ?? fallback.history,
      execution: fallback.execution,
    } satisfies DemoOrderMemory];
  }));

  return { version: 2, orders: state.orders, memory };
}

function normalizeCurrentState(state: DemoPersistedState): DemoPersistedState {
  const memory = { ...state.memory };
  for (const order of state.orders) {
    const fallback = createDefaultOrderMemory(order);
    const existing = memory[order.id];
    memory[order.id] = existing ? {
      ...fallback,
      ...existing,
      tasks: { ...fallback.tasks, ...existing.tasks },
      execution: { ...fallback.execution, ...existing.execution },
    } : fallback;
  }
  return { version: 2, orders: state.orders, memory };
}

export function loadDemoState(fallbackOrders: WorkOrderListItem[]): DemoPersistedState {
  if (typeof window === 'undefined') return createInitialDemoState(fallbackOrders);

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createInitialDemoState(fallbackOrders);

    const parsed = JSON.parse(raw) as { version?: number; orders?: unknown; memory?: unknown };
    if (!isWorkOrderArray(parsed.orders) || !parsed.memory || typeof parsed.memory !== 'object') {
      return createInitialDemoState(fallbackOrders);
    }

    if (parsed.version === 1) return migrateLegacyState(parsed as unknown as LegacyDemoPersistedState);
    if (parsed.version === 2) return normalizeCurrentState(parsed as unknown as DemoPersistedState);
    return createInitialDemoState(fallbackOrders);
  } catch {
    return createInitialDemoState(fallbackOrders);
  }
}

export function saveDemoState(state: DemoPersistedState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

export function clearDemoState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
}
