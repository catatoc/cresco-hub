import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveProjects } from '../active-projects';
import type { HomeProject } from '@/lib/home/queries';

const mkProject = (over: Partial<HomeProject>): HomeProject => ({
  id: 'p',
  name: 'Test',
  icon: null,
  summary: null,
  repoUrl: null,
  designUrl: null,
  status: 'In Progress',
  priority: null,
  completion: 0.5,
  ownerIds: [],
  customerId: 'c',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p',
  openTaskCount: 0,
  recentlyActive: false,
  ...over,
});

describe('ActiveProjects', () => {
  it('renders empty state when no projects', () => {
    render(<ActiveProjects projects={[]} membersById={new Map()} />);
    expect(screen.getByText(/Sin proyectos activos/i)).toBeInTheDocument();
  });

  it('renders the section header with the count', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a' }), mkProject({ id: 'b' })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getByRole('heading', { name: /Proyectos activos/i })).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
  });

  it('renders project name and percentage', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', name: 'Mogos App v2', completion: 0.68 })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getAllByText('Mogos App v2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('68%').length).toBeGreaterThan(0);
  });

  it('renders open task meta when openTaskCount > 0', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', openTaskCount: 14 })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getAllByText(/14 abiertas/).length).toBeGreaterThan(0);
  });

  it('hides percentage cell when completion is null', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', name: 'Foo', completion: null })]}
        membersById={new Map()}
      />,
    );
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('renders status pill text', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', status: 'Planning' })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getAllByText('Planning').length).toBeGreaterThan(0);
  });
});
