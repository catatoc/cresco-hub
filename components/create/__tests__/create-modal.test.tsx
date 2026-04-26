import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProvider, useCreateContext } from '../create-provider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Opener() {
  const ctx = useCreateContext();
  return <button onClick={() => ctx.open('task')}>open</button>;
}

function setup() {
  return render(
    <CreateProvider customerId="cust-1">
      <Opener />
    </CreateProvider>,
  );
}

describe('CreateModal shell', () => {
  it('renders the type toggle (Tarea active by default)', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    const tarea = screen.getByRole('button', { name: /Tipo: Tarea/i });
    expect(tarea).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to Wiki preserves the title', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.change(screen.getByPlaceholderText(/Título/i), {
      target: { value: 'Hola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cambiar a Wiki/i }));
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument();
  });

  it('shows the shortcut footer', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText(/⌘↵.*Crear/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘↵.*otra/)).toBeInTheDocument();
    expect(screen.getByText(/Esc.*cerrar/)).toBeInTheDocument();
  });

  it('Esc with empty title closes silently', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/Título/i)).not.toBeInTheDocument();
  });

  it('Esc with non-empty title prompts confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.change(screen.getByPlaceholderText(/Título/i), {
      target: { value: 'Hola' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
