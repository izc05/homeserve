import { describe, expect, it } from 'vitest';
import {
  demoWorkOrders,
  DEMO_TECHNICIAN_ID,
  DEMO_TENANT_ID,
  nextDemoOrderCode,
} from './demoWorkOrders';

describe('demoWorkOrders', () => {
  it('usa identificadores únicos y una sola organización ficticia', () => {
    expect(new Set(demoWorkOrders.map((order) => order.id)).size).toBe(demoWorkOrders.length);
    expect(demoWorkOrders.every((order) => order.tenantId === DEMO_TENANT_ID)).toBe(true);
  });

  it('incluye órdenes asignadas al técnico de demostración', () => {
    expect(demoWorkOrders.some((order) => order.assignedTo === DEMO_TECHNICIAN_ID)).toBe(true);
  });

  it('genera el siguiente código sin repetir el último', () => {
    expect(nextDemoOrderCode(demoWorkOrders)).toBe('OT-2026-000249');
  });
});
