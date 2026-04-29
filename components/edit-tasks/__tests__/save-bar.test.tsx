import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveBar } from '../save-bar';

describe('SaveBar', () => {
  it('renders Guardar and Cancelar buttons', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('disables Guardar when canSave is false', () => {
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('disables Guardar when not dirty', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('shows "Guardando..." label when saving', () => {
    render(
      <SaveBar
        dirty={true}
        saving={true}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardando/i })).toBeInTheDocument();
  });

  it('calls onSave when Guardar clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancelar clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders an "Editando" indicator', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
  });
});
