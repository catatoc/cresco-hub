import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskEditorContainer } from '../task-editor-container';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

const mkPara = (text: string) => ({
  type: 'paragraph',
  paragraph: {
    rich_text: [
      {
        plain_text: text,
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false },
        href: null,
      },
    ],
  },
});

const mkUnsupported = () => ({
  type: 'toggle',
  id: 'tog-1',
  toggle: { rich_text: [{ plain_text: 'hidden' }] },
});

beforeEach(() => {
  refresh.mockReset();
  successToast.mockReset();
  errorToast.mockReset();
  globalThis.fetch = vi.fn();
});

function fetchOk(body: unknown) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function fetchFail(status: number, body: unknown) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  });
}

describe('TaskEditorContainer', () => {
  it('renders BlocksRenderer in read mode by default', () => {
    render(<TaskEditorContainer blocks={[mkPara('Hello world')]} taskId="t1" />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });

  it('renders a pencil button (desktop only) in read mode', () => {
    render(<TaskEditorContainer blocks={[mkPara('Hello')]} taskId="t1" />);
    const pencil = screen.getByRole('button', { name: /editar/i });
    expect(pencil).toBeInTheDocument();
    expect(pencil.className).toMatch(/hidden sm:/);
  });

  it('switches to edit mode when pencil is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hello')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('shows banner and disables Guardar when doc has an unsupported block', async () => {
    const user = userEvent.setup();
    render(
      <TaskEditorContainer blocks={[mkPara('Hello'), mkUnsupported()]} taskId="t1" />,
    );
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByText(/no soportamos editar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('cancel returns to read mode without prompting when nothing is dirty', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText(/editando/i)).not.toBeInTheDocument();
  });

  it('Guardar is disabled in edit mode until the editor reports a change', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('toasts an error and stays in edit mode on 503 append-failed', async () => {
    fetchFail(503, { error: 'append-failed' });
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));

    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="force-save"]');
    expect(trigger).not.toBeNull();
    await user.click(trigger!);

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
  });

  it('toasts success and exits edit mode on save 200 (via test affordance)', async () => {
    fetchOk({ ok: true, lastEditedTime: '2026-04-29T12:00:00.000Z' });
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));

    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="force-save"]');
    await user.click(trigger!);

    await waitFor(() => expect(successToast).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText(/editando/i)).not.toBeInTheDocument();
  });
});
