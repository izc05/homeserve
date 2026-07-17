import { beforeEach, describe, expect, it } from 'vitest';
import { demoWorkOrders } from '../work-orders/demo/demoWorkOrders';
import {
  createDefaultExecutionState,
  createDefaultOrderMemory,
  createInitialDemoState,
  DEMO_STORAGE_KEY,
  loadDemoState,
} from './demoPersistence';

describe('demo persistence v2', () => {
  beforeEach(() => window.localStorage.clear());

  it('creates memory and an empty execution record for every new order', () => {
    const state = createInitialDemoState(demoWorkOrders);
    expect(state.version).toBe(2);
    expect(state.orders).toHaveLength(demoWorkOrders.length);
    expect(Object.keys(state.memory)).toHaveLength(demoWorkOrders.length);
    expect(createDefaultExecutionState()).toEqual({
      runningSince: null,
      accumulatedSeconds: 0,
      materials: [],
      measurements: [],
      observations: '',
      technicianSignature: null,
      responsibleSignature: null,
      completedAt: null,
    });
  });

  it('preloads coherent execution evidence for a validated order', () => {
    const validated = demoWorkOrders.find((order) => order.status === 'VALIDADA');
    expect(validated).toBeDefined();

    const memory = createDefaultOrderMemory(validated!);
    expect(Object.values(memory.tasks).every(Boolean)).toBe(true);
    expect(memory.finalPhotos).toBeGreaterThan(0);
    expect(memory.execution.accumulatedSeconds).toBeGreaterThan(0);
    expect(memory.execution.technicianSignature).toBeTruthy();
    expect(memory.execution.responsibleSignature).toBeTruthy();
  });

  it('keeps draft execution incomplete', () => {
    const draft = demoWorkOrders.find((order) => order.status === 'BORRADOR');
    expect(draft).toBeDefined();

    const memory = createDefaultOrderMemory(draft!);
    expect(Object.values(memory.tasks).some(Boolean)).toBe(false);
    expect(memory.finalPhotos).toBe(0);
    expect(memory.execution.accumulatedSeconds).toBe(0);
    expect(memory.execution.technicianSignature).toBeNull();
  });

  it('migrates version 1 state without losing tasks or documents', () => {
    const order = demoWorkOrders[0];
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
      version: 1,
      orders: [order],
      memory: {
        [order.id]: {
          tasks: { safety: true, inspect: true, work: false, test: false, report: false },
          initialPhotos: 4,
          finalPhotos: 1,
          documents: ['parte-anterior.pdf'],
          history: [{ id: 'legacy', title: 'Evento anterior', detail: 'Conservado', date: order.createdAt }],
        },
      },
    }));

    const migrated = loadDemoState(demoWorkOrders);
    expect(migrated.version).toBe(2);
    expect(migrated.orders).toHaveLength(1);
    expect(migrated.memory[order.id].tasks.safety).toBe(true);
    expect(migrated.memory[order.id].initialPhotos).toBe(4);
    expect(migrated.memory[order.id].documents).toEqual(['parte-anterior.pdf']);
    expect(migrated.memory[order.id].execution).toBeDefined();
  });
});
