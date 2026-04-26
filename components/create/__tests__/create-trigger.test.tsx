import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProvider, useCreateContext } from '../create-provider';
import { CreateTrigger } from '../create-trigger';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Probe() {
  const ctx = useCreateContext();
  return <span data-testid="open">{String(ctx.isOpen)}</span>;
}

describe('CreateTrigger', () => {
  it('opens the modal when clicked', () => {
    render(
      <CreateProvider customerId="cust-1">
        <CreateTrigger />
        <Probe />
      </CreateProvider>,
    );
    expect(screen.getByTestId('open').textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /Crear/i }));
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('renders kbd C', () => {
    render(
      <CreateProvider customerId="cust-1">
        <CreateTrigger />
      </CreateProvider>,
    );
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
