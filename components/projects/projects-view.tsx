'use client';

import { useState, useMemo } from 'react';
import type { Project } from '@/schemas/project';
import { Tabs } from './tabs';
import { ProjectCard } from './project-card';

type Tab = 'active' | 'planning' | 'completed' | 'all';

// TODO(refactor-C): align tab taxonomy with real Notion Project statuses.
function isActive(p: Project) {
  return p.status === 'In Progress' || p.status === 'Paused';
}

export function ProjectsView({ projects }: { projects: Project[] }) {
  const [tab, setTab] = useState<Tab>('active');

  const counts = useMemo<Record<Tab, number>>(() => ({
    active: projects.filter(isActive).length,
    planning: projects.filter((p) => p.status === 'Planning' || p.status === 'Backlog').length,
    completed: projects.filter((p) => p.status === 'Done' || p.status === 'Canceled').length,
    all: projects.length,
  }), [projects]);

  const visible = useMemo(() => {
    switch (tab) {
      case 'active': return projects.filter(isActive);
      case 'planning': return projects.filter((p) => p.status === 'Planning' || p.status === 'Backlog');
      case 'completed': return projects.filter((p) => p.status === 'Done' || p.status === 'Canceled');
      case 'all': return projects;
    }
  }, [projects, tab]);

  return (
    <>
      <Tabs current={tab} counts={counts} onChange={setTab} />
      {visible.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          No hay proyectos en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {visible.map((p, i) => <ProjectCard key={p.id} project={p} accentIndex={i} />)}
        </div>
      )}
    </>
  );
}
