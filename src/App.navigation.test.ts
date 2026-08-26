import { describe, expect, it } from 'vitest';
import { mainNavigation, secondaryNavigation } from './navigation/appNavigation';

describe('IsiVoltPro OT navigation domain', () => {
  it('does not expose the legacy photovoltaic assets module in navigation', () => {
    const navigation = [...mainNavigation, ...secondaryNavigation];

    expect(navigation.some((item) => item.id === 'assets')).toBe(false);
    expect(navigation.some((item) => /equipos?\s*fv/i.test(item.label))).toBe(false);
  });

  it('keeps OT operational navigation available', () => {
    expect(mainNavigation.map((item) => item.id)).toEqual([
      'dashboard',
      'orders',
      'planning',
      'technician',
    ]);

    expect(secondaryNavigation.map((item) => item.id)).toEqual([
      'technicians',
      'clients',
      'reports',
      'audit',
      'configuration',
    ]);
  });
});
