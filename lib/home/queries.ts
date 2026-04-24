import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';

export async function getHomeData(customerId: string, sprintId: string | null) {
  const [tasks, meetings, wiki] = await Promise.all([
    queryTasksByCustomerAndSprint(customerId, sprintId),
    queryMeetingsByCustomer(customerId),
    queryWikiByCustomer(customerId),
  ]);

  const stats = {
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    todo: tasks.filter((t) => t.status === 'Not Started').length,
    done: tasks.filter((t) => t.status === 'Done').length,
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
      if (t.status === 'Done' || t.status === 'Archived') return false;
      if (!t.dueDate) return true;
      const d = new Date(t.dueDate);
      return d.toDateString() === todayStr || d.getTime() < Date.now();
    })
    .slice(0, 5);

  return { tasks, stats, upcomingMeeting, recentWiki, myTasksToday };
}
