import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createRef } from 'react';

const { mockPush, mockClose, mockToast } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockClose: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/proyectos/proj-1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));
vi.mock('../create-provider', () => ({
  useCreateContext: () => ({
    isOpen: true,
    type: 'wiki',
    open: vi.fn(),
    close: mockClose,
    setType: vi.fn(),
  }),
}));
vi.mock('sonner', () => ({ toast: mockToast }));

import { WikiForm } from '../wiki-form';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('WikiForm', () => {
  it('renders default emoji 📄', () => {
    render(
      <WikiForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('on submit OK redirects to /wiki/[id]', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wiki-1', url: 'u' }),
    });
    render(
      <WikiForm
        customerId="c1"
        title="Doc"
        onTitleChange={() => {}}
        titleRef={createRef()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Crear y abrir|Creando/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/wiki/wiki-1'));
    expect(mockClose).toHaveBeenCalled();
  });

  it('"Crear otra" with Wiki does NOT redirect, shows toast with Abrir', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wiki-1', url: 'u' }),
    });
    render(
      <WikiForm
        customerId="c1"
        title="Doc"
        onTitleChange={() => {}}
        titleRef={createRef()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Crear otra/i));
    fireEvent.click(screen.getByRole('button', { name: /Crear y abrir|Creando/ }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalledWith('/wiki/wiki-1');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const opts = mockToast.success.mock.calls[0]![1] as { action: { label: string } };
    expect(opts.action.label).toBe('Abrir');
  });
});
