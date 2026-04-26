'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export type CreateInheritedContext = {
  sprintId?: string;
  projectId?: string;
  meetingId?: string;
};

export function useCreateContext(): CreateInheritedContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === '/tareas') {
    const sprint = searchParams.get('sprint');
    return sprint ? { sprintId: sprint } : {};
  }

  const projectMatch = pathname.match(/^\/proyectos\/([^/]+)$/);
  if (projectMatch) return { projectId: projectMatch[1]! };

  const meetingMatch = pathname.match(/^\/reuniones\/([^/]+)$/);
  if (meetingMatch) return { meetingId: meetingMatch[1]! };

  return {};
}
