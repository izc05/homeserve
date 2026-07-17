import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export type DemoTaskState = Record<string, boolean>;

export type DemoHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
};

export type DemoOrderMemory = {
  tasks: DemoTaskState;
  initialPhotos: number;
  finalPhotos: number;
  documents: string[];
  history: DemoHistoryEntry[];
};

export type DemoPersistedState = {
  version: 1;
  orders: WorkOrderListItem[];
  memory: Record<string, DemoOrderMemory>;
};

export const DEMO_STORAGE_KEY = 'isivoltpro.demo.v1';

const taskDefaults = {
  safety: false,
  inspect: false,
  work: false,
  test: false,
  report: false,
} satisfies DemoTaskState;

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
  };
}

export function createInitialDemoState(orders: WorkOrderListItem[]): DemoPersistedState {
  return {
    version: 1,
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

export function loadDemoState(fallbackOrders: WorkOrderListItem[]): DemoPersistedState {
  if (typeof window === 'undefined') return createInitialDemoState(fallbackOrders);

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createInitialDemoState(fallbackOrders);

    const parsed = JSON.parse(raw) as Partial<DemoPersistedState>;
    if (parsed.version !== 1 || !isWorkOrderArray(parsed.orders) || !parsed.memory || typeof parsed.memory !== 'object') {
      return createInitialDemoState(fallbackOrders);
    }

    const memory = { ...parsed.memory } as Record<string, DemoOrderMemory>;
    for (const order of parsed.orders) {
      if (!memory[order.id]) memory[order.id] = createDefaultOrderMemory(order);
    }

    return { version: 1, orders: parsed.orders, memory };
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
