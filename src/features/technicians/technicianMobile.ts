import type { WorkOrderListItem } from '../work-orders/api/workOrdersRepository';

export type TechnicianMobileAction = 'accept' | 'start';
export type TechnicianOrderGroup = 'pendientes' | 'hoy' | 'urgentes' | 'en_curso' | 'bloqueadas' | 'historial';

export type TechnicianActionGuard = {
  acquire: () => boolean;
  release: () => void;
};

export function createTechnicianActionGuard(): TechnicianActionGuard {
  let pending = false;
  return {
    acquire: () => {
      if (pending) return false;
      pending = true;
      return true;
    },
    release: () => {
      pending = false;
    },
  };
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupTechnicianOrders(
  orders: WorkOrderListItem[],
  viewerId: string,
  now = new Date(),
): Record<TechnicianOrderGroup, WorkOrderListItem[]> {
  const own = orders.filter((order) => order.assignedTo === viewerId);
  const today = localDateKey(now);
  return {
    pendientes: own.filter((order) => order.status === 'ASIGNADA' || order.status === 'ACEPTADA'),
    hoy: own.filter((order) => order.plannedAt?.slice(0, 10) === today && !['VALIDADA', 'CANCELADA'].includes(order.status)),
    urgentes: own.filter((order) => ['urgente', 'critica'].includes(order.priority) && !['VALIDADA', 'CANCELADA'].includes(order.status)),
    en_curso: own.filter((order) => order.status === 'EN_CURSO'),
    bloqueadas: own.filter((order) => order.status === 'BLOQUEADA'),
    historial: own
      .filter((order) => ['FINALIZADA_TECNICO', 'VALIDADA'].includes(order.status))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 12),
  };
}
