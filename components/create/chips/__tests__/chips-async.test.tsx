import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/components/create/__tests__/intl-render';
import { ChipSprint } from '../chip-sprint';
import { ChipTeam } from '../chip-team';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('ChipSprint', () => {
  it('shows + Sprint when empty', () => {
    render(<ChipSprint value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Sprint')).toBeInTheDocument();
  });

  it('fetches and lists options on open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        options: [{ id: 's1', label: 'Sprint 12', sublabel: 'Current' }],
      }),
    });
    render(<ChipSprint value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByText('+ Sprint'));
    await waitFor(() => {
      expect(screen.getByText('Sprint 12')).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/create/options?type=sprint');
  });

  it('selecting an option calls onChange with id+label', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ options: [{ id: 's1', label: 'Sprint 12' }] }),
    });
    const onChange = vi.fn();
    render(<ChipSprint value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Sprint'));
    await waitFor(() => screen.getByText('Sprint 12'));
    fireEvent.click(screen.getByText('Sprint 12'));
    expect(onChange).toHaveBeenCalledWith({ id: 's1', label: 'Sprint 12' });
  });
});

describe('ChipTeam (multi-select with q)', () => {
  it('debounces search query', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [{ id: 'm1', label: 'Carlos' }] }),
    });
    render(<ChipTeam value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('+ Asignar'));
    const input = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(input, { target: { value: 'car' } });
    await waitFor(() => screen.getByText('Carlos'));
    expect(mockFetch).toHaveBeenCalledWith('/api/create/options?type=team&q=car');
  });

  it('toggles a member into the value array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [{ id: 'm1', label: 'Carlos' }] }),
    });
    const onChange = vi.fn();
    render(<ChipTeam value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Asignar'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: 'car' },
    });
    await waitFor(() => screen.getByText('Carlos'));
    fireEvent.click(screen.getByText('Carlos'));
    expect(onChange).toHaveBeenCalledWith([{ id: 'm1', label: 'Carlos' }]);
  });
});
