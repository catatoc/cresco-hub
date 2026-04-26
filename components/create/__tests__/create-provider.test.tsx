import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProvider, useCreateContext as useCreateModalContext } from '../create-provider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Probe() {
  const ctx = useCreateModalContext();
  return (
    <div>
      <span data-testid="open">{String(ctx.isOpen)}</span>
      <span data-testid="type">{ctx.type}</span>
      <button onClick={() => ctx.open()}>open</button>
    </div>
  );
}

function setup() {
  return render(
    <CreateProvider customerId="cust-1">
      <Probe />
    </CreateProvider>,
  );
}

describe('CreateProvider', () => {
  it('starts closed with type=task', () => {
    setup();
    expect(screen.getByTestId('open').textContent).toBe('false');
    expect(screen.getByTestId('type').textContent).toBe('task');
  });

  it('opens via context.open()', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('opens when pressing C globally', () => {
    setup();
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('does NOT open when ⌘C', () => {
    setup();
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    expect(screen.getByTestId('open').textContent).toBe('false');
  });

  it('does NOT open when focus is on an input', () => {
    setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('false');
    document.body.removeChild(input);
  });

  it('does NOT open when another dialog is open', () => {
    setup();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.appendChild(dialog);
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('false');
    document.body.removeChild(dialog);
  });
});
