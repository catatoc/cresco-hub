import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectStats } from '../project-stats';

describe('ProjectStats', () => {
  it('renders 4 cards when all data is present', () => {
    const future = new Date(Date.now() + 12 * 86_400_000).toISOString();
    render(
      <ProjectStats
        completion={0.62}
        tasksDone={8}
        tasksTotal={12}
        meetingsCount={4}
        endDate={future}
      />,
    );
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('8 / 12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/12d/)).toBeInTheDocument();
  });

  it('omits the avance card when completion is null', () => {
    render(
      <ProjectStats
        completion={null}
        tasksDone={0}
        tasksTotal={0}
        meetingsCount={0}
        endDate={null}
      />,
    );
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
  });

  it('omits the días-restantes card when endDate is null', () => {
    render(
      <ProjectStats
        completion={0.5}
        tasksDone={1}
        tasksTotal={2}
        meetingsCount={0}
        endDate={null}
      />,
    );
    expect(screen.queryByText(/restantes/i)).not.toBeInTheDocument();
  });

  it('shows "Vencido" with negative days when endDate is in the past', () => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(
      <ProjectStats
        completion={null}
        tasksDone={0}
        tasksTotal={0}
        meetingsCount={0}
        endDate={past}
      />,
    );
    expect(screen.getByText(/Vencido/i)).toBeInTheDocument();
  });
});
