import {
  queryTasksByCustomerAndSprint,
  queryTasksByCustomerSprintAndMember,
} from '@/lib/notion/tasks';
import {
  queryMeetingsByCustomer,
  queryMeetingsByCustomerAndMember,
} from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import {
  queryProjectsByCustomer,
  queryProjectsByCustomerAndMember,
} from '@/lib/notion/projects';
import { getUpcomingSprint } from '@/lib/notion/sprints';
import type { Project, ProjectStatus } from '@/schemas/project';
import type { Task } from '@/schemas/task';

export type HomeProject = Project & {
  openTaskCount: number;
  recentlyActive: boolean;
};

const ACTIVE_STATUS_ORDER: Partial<Record<ProjectStatus, number>> = {
  'In Progress': 0,
  Starting: 1,
  Planning: 2,
  Paused: 3,
};

function isActiveStatus(s: ProjectStatus | null): s is ProjectStatus {
  return s !== null && s in ACTIVE_STATUS_ORDER;
}

function shapeActiveProjects(projects: Project[], tasks: Task[]): HomeProject[] {
  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.projectId) continue;
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  return projects
    .filter((p) => isActiveStatus(p.status))
    .map((p): HomeProject => {
      const projectTasks = tasksByProject.get(p.id) ?? [];
      const openTaskCount = projectTasks.filter(
        (t) => t.status !== 'Done' && t.status !== 'Archived',
      ).length;
      return { ...p, openTaskCount, recentlyActive: openTaskCount > 0 };
    })
    .sort((a, b) => {
      const sa = ACTIVE_STATUS_ORDER[a.status as ProjectStatus] ?? 99;
      const sb = ACTIVE_STATUS_ORDER[b.status as ProjectStatus] ?? 99;
      if (sa !== sb) return sa - sb;
      return (b.completion ?? 0) - (a.completion ?? 0);
    })
    .slice(0, 6);
}

export async function getHomeData(
  customerId: string,
  sprintId: string | null,
  memberId: string | null = null,
) {
  const upcomingSprint = await getUpcomingSprint();

  const [tasks, meetings, wiki, projects, upcomingTasksRaw] = await Promise.all([
    memberId
      ? queryTasksByCustomerSprintAndMember(customerId, sprintId, memberId)
      : queryTasksByCustomerAndSprint(customerId, sprintId),
    memberId
      ? queryMeetingsByCustomerAndMember(customerId, memberId)
      : queryMeetingsByCustomer(customerId),
    queryWikiByCustomer(customerId),
    memberId
      ? queryProjectsByCustomerAndMember(customerId, memberId)
      : queryProjectsByCustomer(customerId),
    upcomingSprint
      ? memberId
        ? queryTasksByCustomerSprintAndMember(customerId, upcomingSprint.id, memberId)
        : queryTasksByCustomerAndSprint(customerId, upcomingSprint.id)
      : Promise.resolve([] as Task[]),
  ]);

  // Spanish labels for UI, mapped from real Notion statuses:
  //   "En progreso"  = In Progress
  //   "Por hacer"    = Refining + Not Started (anything pending)
  //   "Completadas"  = Done   (Archived excluded from throughput)
  const stats = {
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    todo: tasks.filter((t) => t.status === 'Not Started' || t.status === 'Refining').length,
    done: tasks.filter((t) => t.status === 'Done').length,
    total: tasks.filter((t) => t.status !== 'Archived').length,
  };

  const lastMeeting = meetings[0] ?? null;

  const recentWiki = wiki.slice(0, 4);

  const todayStr = new Date().toDateString();
  const myTasksToday = tasks
    .filter((t) => {
      if (t.status === 'Done' || t.status === 'Archived') return false;
      if (!t.dueDate) return true;
      const d = new Date(t.dueDate);
      return d.toDateString() === todayStr || d.getTime() < Date.now();
    })
    .slice(0, 5);

  const activeProjects = shapeActiveProjects(projects, tasks);

  const upcomingTasks = upcomingTasksRaw
    .filter((t) => t.status !== 'Done' && t.status !== 'Archived')
    .slice(0, 5);

  return {
    tasks,
    stats,
    lastMeeting,
    recentWiki,
    myTasksToday,
    activeProjects,
    projects,
    upcomingSprint,
    upcomingTasks,
  };
}
