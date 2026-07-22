import { afterEach, describe, expect, it, vi } from 'vitest';
import { deferAuthIdentityRefresh } from './authIdentityScheduler';

describe('actualización de identidad tras Auth', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('difiere la consulta hasta que termina el callback de onAuthStateChange', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();

    deferAuthIdentityRefresh(refresh);

    expect(refresh).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
