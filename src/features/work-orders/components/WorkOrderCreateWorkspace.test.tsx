// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkOrderCreateWorkspace, { initialWorkOrderCreateMode } from './WorkOrderCreateWorkspace';

vi.mock('./QuickCreateWorkOrderForm', () => ({
  default: () => <div data-testid="quick-create-form">Formulario rápido</div>,
}));

vi.mock('./CreateWorkOrderForm', () => ({
  default: () => <div data-testid="advanced-create-form">Formulario avanzado</div>,
}));

const baseProps = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  canManage: true,
  onCancel: vi.fn(),
  onCreated: vi.fn(),
};

afterEach(() => cleanup());

describe('initialWorkOrderCreateMode', () => {
  it('starts in quick mode when Nueva OT has no context', () => {
    expect(initialWorkOrderCreateMode()).toBe('quick');
    expect(initialWorkOrderCreateMode({})).toBe('quick');
  });

  it('starts in advanced mode when creation arrives with context', () => {
    expect(initialWorkOrderCreateMode({
      clientId: '22222222-2222-4222-8222-222222222222',
    })).toBe('advanced');
  });
});

describe('WorkOrderCreateWorkspace', () => {
  it('shows the quick form by default for a normal Nueva OT', () => {
    render(<WorkOrderCreateWorkspace {...baseProps} />);

    expect(screen.getByTestId('quick-create-form')).toBeTruthy();
    expect(screen.queryByTestId('advanced-create-form')).toBeNull();
    expect(screen.getByRole('button', { name: 'OT rápida' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('lets the user switch to the advanced form', () => {
    render(<WorkOrderCreateWorkspace {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'OT avanzada' }));

    expect(screen.getByTestId('advanced-create-form')).toBeTruthy();
    expect(screen.queryByTestId('quick-create-form')).toBeNull();
  });

  it('preserves contextual legacy flows by starting advanced', () => {
    render(<WorkOrderCreateWorkspace
      {...baseProps}
      initialValues={{
        installationId: '33333333-3333-4333-8333-333333333333',
        title: 'Seguimiento de OT relacionada',
      }}
    />);

    expect(screen.getByTestId('advanced-create-form')).toBeTruthy();
    expect(screen.queryByTestId('quick-create-form')).toBeNull();
    expect(screen.getByRole('button', { name: 'OT avanzada' }).getAttribute('aria-pressed')).toBe('true');
  });
});
