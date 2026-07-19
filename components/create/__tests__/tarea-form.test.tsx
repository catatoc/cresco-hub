import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './intl-render';
import { createRef } from 'react';
import { TareaForm } from '../tarea-form';

const { mockUseCreate, mockToast } = vi.hoisted(() => ({
  mockUseCreate: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams('sprint=ctx-sprint'),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('../create-provider', () => ({
  useCreateContext: () => mockUseCreate(),
}));
vi.mock('sonner', () => ({ toast: mockToast }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ options: [] }) })),
  );
  mockUseCreate.mockReturnValue({
    isOpen: true,
    type: 'task',
    open: vi.fn(),
    close: vi.fn(),
    setType: vi.fn(),
  });
});

describe('TareaForm', () => {
  it('renders pre-filled Sprint chip from context', () => {
    render(
      <TareaForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText(/ctx-sprint|Sprint/i)).toBeInTheDocument();
  });

  it('does NOT render a Customer chip', () => {
    render(
      <TareaForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.queryByText(/Customer|c1/i)).not.toBeInTheDocument();
  });

  it('shows char counter when over 200', () => {
    const long = 'a'.repeat(205);
    render(
      <TareaForm
        customerId="c1"
        title={long}
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText(/205\/200/)).toBeInTheDocument();
  });
});
