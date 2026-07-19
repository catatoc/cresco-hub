import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/components/create/__tests__/intl-render';
import { ChipPriority } from '../chip-priority';
import { ChipDate } from '../chip-date';
import { ChipCategory } from '../chip-category';

describe('ChipPriority', () => {
  it('renders + Prioridad when value is null', () => {
    render(<ChipPriority value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Prioridad')).toBeInTheDocument();
  });

  it('shows the selected value', () => {
    render(<ChipPriority value="High" onChange={() => {}} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onChange when an option is picked', () => {
    const onChange = vi.fn();
    render(<ChipPriority value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Prioridad'));
    fireEvent.click(screen.getByText('Medium'));
    expect(onChange).toHaveBeenCalledWith('Medium');
  });

  it('Esc inside popover closes only the popover (does not bubble)', () => {
    const onChange = vi.fn();
    const outerHandler = vi.fn();
    render(
      <div onKeyDown={outerHandler}>
        <ChipPriority value={null} onChange={onChange} />
      </div>,
    );
    fireEvent.click(screen.getByText('+ Prioridad'));
    expect(screen.getByText('Medium')).toBeInTheDocument(); // popover open

    // press Esc on the popover container
    const popover = screen.getByText('Medium').closest('[tabindex="-1"]')!;
    fireEvent.keyDown(popover, { key: 'Escape' });

    expect(screen.queryByText('Medium')).not.toBeInTheDocument(); // popover closed
    expect(outerHandler).not.toHaveBeenCalled(); // event did not bubble
  });

  it('clears via the ✕ button when value is set', () => {
    const onChange = vi.fn();
    render(<ChipPriority value="High" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Quitar prioridad/i));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('ChipDate', () => {
  it('renders + Fecha when value is null', () => {
    render(<ChipDate value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Fecha')).toBeInTheDocument();
  });

  it('shows YYYY-MM-DD when set', () => {
    render(<ChipDate value="2026-05-01" onChange={() => {}} />);
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
  });

  it('calls onChange with new date', () => {
    const onChange = vi.fn();
    render(<ChipDate value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Fecha'));
    const input = screen.getByLabelText(/Fecha/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-10' } });
    expect(onChange).toHaveBeenCalledWith('2026-05-10');
  });
});

describe('ChipCategory', () => {
  it('renders + Categoría when empty', () => {
    render(<ChipCategory value={[]} onChange={() => {}} />);
    expect(screen.getByText('+ Categoría')).toBeInTheDocument();
  });

  it('shows count when categories selected', () => {
    render(
      <ChipCategory value={['Documentation', 'Planning']} onChange={() => {}} />,
    );
    expect(screen.getByText(/Categoría · 2/)).toBeInTheDocument();
  });

  it('toggles a category', () => {
    const onChange = vi.fn();
    render(<ChipCategory value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Categoría'));
    fireEvent.click(screen.getByText('Documentation'));
    expect(onChange).toHaveBeenCalledWith(['Documentation']);
  });
});
