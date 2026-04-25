import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { getCurrentSprint } from '@/lib/notion/sprints';
import type { SuggestionsResponse, SearchItem } from '@/lib/search/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

function isSameDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const today = new Date();
  const [meetingsR, sprintR] = await Promise.allSettled([
    queryMeetingsByCustomer(ctx.customerId),
    getCurrentSprint(),
  ]);

  const meetings = meetingsR.status === 'fulfilled' ? meetingsR.value : [];
  const currentSprint = sprintR.status === 'fulfilled' ? sprintR.value : null;

  const todayMeetingObj = meetings.find((m) => m.date && isSameDay(m.date, today)) ?? null;
  const todayMeeting = todayMeetingObj
    ? { id: todayMeetingObj.id, title: todayMeetingObj.title, date: todayMeetingObj.date! }
    : null;

  let dueToday: SuggestionsResponse['dueToday'] = null;
  if (currentSprint) {
    const tasks = await queryTasksByCustomerAndSprint(ctx.customerId, currentSprint.id).catch(
      () => [],
    );
    const todayTasks = tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, today));
    if (todayTasks.length > 0) {
      const firstThree: SearchItem[] = todayTasks.slice(0, 3).map((t) => ({
        id: t.id,
        type: 'task',
        title: t.title,
        url: `/tareas/${t.id}`,
        meta: { status: t.status, date: t.dueDate, priority: t.priority, emoji: t.type },
        score: 0,
      }));
      dueToday = { count: todayTasks.length, firstThree };
    }
  }

  const activeSprint = currentSprint
    ? { id: currentSprint.id, name: currentSprint.name, daysLeft: daysUntil(currentSprint.endDate) }
    : null;

  const body: SuggestionsResponse = { todayMeeting, dueToday, activeSprint };
  return NextResponse.json(body);
}
