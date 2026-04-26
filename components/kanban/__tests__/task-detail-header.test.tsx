import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailHeader } from '../task-detail-header';

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

describe('TaskDetailHeader', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
  });

  it('renders back button and breadcrumb crumbs', () => {
    render(
      <TaskDetailHeader
        crumbs={[{ label: 'App Mobile' }, { label: 'Sprint 24' }]}
      />,
    );
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('App Mobile')).toBeInTheDocument();
    expect(screen.getByText('Sprint 24')).toBeInTheDocument();
  });

  it('calls router.back when back button is clicked and history exists', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    await user.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('calls router.push("/tareas") when there is no history', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 1 } });
    render(<TaskDetailHeader crumbs={[]} />);
    await user.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockPush).toHaveBeenCalledWith('/tareas');
  });

  it('triggers goBack on Escape key', () => {
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not trigger goBack on other keys', () => {
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockBack).not.toHaveBeenCalled();
  });
});
