import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMetaRow } from '../project-meta-row';

describe('ProjectMetaRow', () => {
  it('renders date range, owner name and headcount', () => {
    render(
      <ProjectMetaRow
        startDate="2026-06-15"
        endDate="2026-09-30"
        ownerName="Dani"
        teamCount={4}
      />,
    );
    expect(screen.getByText(/15 jun.*30 sep/i)).toBeInTheDocument();
    expect(screen.getByText(/Dani/)).toBeInTheDocument();
    expect(screen.getByText(/4 personas/)).toBeInTheDocument();
  });

  it('renders only end date as "Vence X" when startDate is null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate="2026-09-30" ownerName={null} teamCount={0} />,
    );
    expect(screen.getByText(/Vence 30 sep/i)).toBeInTheDocument();
  });

  it('omits the owner chip when ownerName is null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate={null} ownerName={null} teamCount={0} />,
    );
    expect(screen.queryByText(/Owner:/)).not.toBeInTheDocument();
  });

  it('omits dates entirely when both are null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate={null} ownerName="Ana" teamCount={2} />,
    );
    expect(screen.queryByText(/Vence/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });
});
