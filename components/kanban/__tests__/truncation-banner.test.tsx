import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TruncationBanner } from '../truncation-banner';

describe('TruncationBanner', () => {
  it('renders cap and warning text with Mías emphasized', () => {
    render(<TruncationBanner cap={500} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 500 tareas/i)).toBeInTheDocument();
    // Mías is in its own bold span — locate it specifically
    const mias = screen.getByText('Mías');
    expect(mias).toBeInTheDocument();
    expect(mias.className).toContain('font-medium');
  });
});
