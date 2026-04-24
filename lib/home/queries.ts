import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { queryWikiByClient } from '@/lib/notion/wiki';

export async function getHomeData(clientId: string, cycle: string) {
  const [tasks, meetings, wiki] = await Promise.all([
    queryTasksByClientAndCycle(clientId, cycle),
    queryMeetingsByClient(clientId),
    queryWikiByClient(clientId),
  ]);

  const stats = {
    inProgress: tasks.filter((t) => t.status === 'En progreso').length,
    todo: tasks.filter((t) => t.status === 'Por hacer').length,
    done: tasks.filter((t) => t.status === 'Hecho').length,
    total: tasks.length,
  };

  const now = Date.now();
  const upcomingMeeting =
    meetings
      .filter((m) => m.date && new Date(m.date).getTime() >= now)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0] ??
    meetings[0] ??
    null;

  const recentWiki = wiki.slice(0, 4);

  const todayStr = new Date().toDateString();
  const myTasksToday = tasks
    .filter((t) => {
      if (t.status === 'Hecho') return false;
      if (!t.dueDate) return true;
      const d = new Date(t.dueDate);
      return d.toDateString() === todayStr || d.getTime() < Date.now();
    })
    .slice(0, 5);

  return { tasks, stats, upcomingMeeting, recentWiki, myTasksToday };
}
