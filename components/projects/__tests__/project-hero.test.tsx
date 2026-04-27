import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectHero } from '../project-hero';
import type { Project } from '@/schemas/project';

vi.mock('@/components/projects/new-task-button', () => ({
  NewTaskButton: () => <button>+ Tarea</button>,
}));

const mkProject = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Lanzamiento Amedi v2',
  icon: '🏥',
  summary: 'Lanzar la v2 de la plataforma con onboarding renovado.',
  status: 'In Progress',
  priority: 'High',
  completion: 0.62,
  ownerIds: [],
  customerId: 'c1',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p1',
  ...over,
});

describe('ProjectHero', () => {
  it('renders name, status pill, priority pill, summary', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    expect(screen.getByRole('heading', { name: /Lanzamiento Amedi v2/i })).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(/onboarding renovado/i)).toBeInTheDocument();
  });

  it('renders the icon emoji when present, fallback FolderKanban otherwise', () => {
    const { rerender } = render(<ProjectHero project={mkProject({ icon: '🚀' })} accentIndex={0} />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
    rerender(<ProjectHero project={mkProject({ icon: null })} accentIndex={0} />);
    expect(screen.queryByText('🚀')).not.toBeInTheDocument();
  });

  it('omits the summary block when summary is null', () => {
    render(<ProjectHero project={mkProject({ summary: null })} accentIndex={0} />);
    expect(screen.queryByText(/onboarding renovado/i)).not.toBeInTheDocument();
  });

  it('renders an "Abrir en Notion" external link to project.url', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    const link = screen.getByRole('link', { name: /notion/i });
    expect(link).toHaveAttribute('href', 'https://notion.so/p1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the New Task button', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    expect(screen.getByRole('button', { name: /Tarea/i })).toBeInTheDocument();
  });
});
