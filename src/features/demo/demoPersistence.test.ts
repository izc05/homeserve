import { describe, expect, it } from 'vitest';
import { demoWorkOrders } from '../work-orders/demo/demoWorkOrders';
import { createDefaultOrderMemory, createInitialDemoState } from './demoPersistence';

describe('demoPersistence', () => {
  it('crea memoria por cada orden', () => {
    const state = createInitialDemoState(demoWorkOrders);

    expect(state.version).toBe(1);
    expect(state.orders).toHaveLength(demoWorkOrders.length);
    expect(Object.keys(state.memory)).toHaveLength(demoWorkOrders.length);
  });

  it('marca como completadas las tareas coherentes con una OT validada', () => {
    const validated = demoWorkOrders.find((order) => order.status === 'VALIDADA');
    expect(validated).toBeDefined();

    const memory = createDefaultOrderMemory(validated!);
    expect(Object.values(memory.tasks).every(Boolean)).toBe(true);
    expect(memory.finalPhotos).toBeGreaterThan(0);
  });

  it('mantiene pendientes las tareas de un borrador', () => {
    const draft = demoWorkOrders.find((order) => order.status === 'BORRADOR');
    expect(draft).toBeDefined();

    const memory = createDefaultOrderMemory(draft!);
    expect(Object.values(memory.tasks).some(Boolean)).toBe(false);
    expect(memory.finalPhotos).toBe(0);
  });
});
