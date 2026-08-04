// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthEcosystemVisual, { ROTATION_INTERVAL_MS } from './AuthEcosystemVisual';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('AuthEcosystemVisual', () => {
  it('rotates through six ecosystem scenes every seven seconds', () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    render(<AuthEcosystemVisual />);

    expect(screen.getAllByRole('button', { name: /^Mostrar / })).toHaveLength(6);
    expect(screen.getByText('Planifica, asigna y valida cada intervención.')).toBeTruthy();

    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS));

    expect(screen.getByText('Controla herramientas mediante QR y NFC.')).toBeTruthy();
  });

  it('keeps the first scene stable when reduced motion is requested', () => {
    vi.useFakeTimers();
    mockReducedMotion(true);
    render(<AuthEcosystemVisual />);

    act(() => vi.advanceTimersByTime(ROTATION_INTERVAL_MS * 2));

    expect(screen.getByText('Planifica, asigna y valida cada intervención.')).toBeTruthy();
  });
});
