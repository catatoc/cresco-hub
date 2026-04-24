import { queryTasksByCustomerAndTitle } from '@/lib/notion/tasks';
import { queryMeetingsByCustomerAndTitle } from '@/lib/notion/meetings';
import { queryWikiByCustomerAndTitle } from '@/lib/notion/wiki';
import { queryProjectsByCustomerAndTitle } from '@/lib/notion/projects';
import { queryMembersByCustomerAndName } from '@/lib/notion/team';
import type { Task } from '@/schemas/task';
import type { Meeting } from '@/schemas/meeting';
import type { WikiPage } from '@/schemas/wiki';
import type { Project } from '@/schemas/project';
import type { TeamMember } from '@/schemas/team-member';
import { scoreMatch, sortByScoreDesc } from './rank';
import type {
  SearchEntityType,
  SearchFilter,
  SearchGroup,
  SearchItem,
  SearchResponse,
} from './types';

type RunnerArgs = { customerId: string; term: string; filter: SearchFilter };

type EntityRunner = {
  type: SearchEntityType;
  run: () => Promise<SearchItem[]>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function taskToItem(t: Task, term: string): SearchItem {
  return {
    id: t.id,
    type: 'task',
    title: t.title,
    url: `/tareas/${t.id}`,
    meta: {
      status: t.status,
      date: t.dueDate,
      priority: t.priority,
      emoji: t.type,
    },
    score: scoreMatch(term, t.title, { date: t.dueDate }),
  };
}

function meetingToItem(m: Meeting, term: string): SearchItem {
  return {
    id: m.id,
    type: 'meeting',
    title: m.title,
    url: `/reuniones/${m.id}`,
    meta: { date: m.date, emoji: m.meetingType },
    score: scoreMatch(term, m.title, { date: m.date }),
  };
}

function wikiToItem(w: WikiPage, term: string): SearchItem {
  return {
    id: w.id,
    type: 'wiki',
    title: w.title,
    url: `/wiki/${w.id}`,
    meta: { date: w.lastEditedAt, emoji: w.icon },
    score: scoreMatch(term, w.title, { date: w.lastEditedAt }),
  };
}

function projectToItem(p: Project, term: string): SearchItem {
  return {
    id: p.id,
    type: 'project',
    title: p.name,
    url: `/proyectos`,
    meta: { status: p.status, date: p.endDate, emoji: p.icon },
    score: scoreMatch(term, p.name),
  };
}

function memberToItem(m: TeamMember, term: string): SearchItem {
  return {
    id: m.id,
    type: 'person',
    title: m.name,
    url: `#`,
    meta: { projectName: m.area, avatarInitials: initials(m.name) },
    score: scoreMatch(term, m.name),
  };
}

function enabled(filter: SearchFilter, type: SearchEntityType): boolean {
  return filter === 'all' || filter === type;
}

export async function queryAll({ customerId, term, filter }: RunnerArgs): Promise<SearchResponse> {
  const started = Date.now();

  if (term.length < 2) {
    return { query: term, filter, tookMs: Date.now() - started, groups: [] };
  }

  const runners: EntityRunner[] = [];
  if (enabled(filter, 'tasks')) {
    runners.push({
      type: 'tasks',
      run: async () =>
        (await queryTasksByCustomerAndTitle(customerId, term)).map((t) => taskToItem(t, term)),
    });
  }
  if (enabled(filter, 'meetings')) {
    runners.push({
      type: 'meetings',
      run: async () =>
        (await queryMeetingsByCustomerAndTitle(customerId, term)).map((m) => meetingToItem(m, term)),
    });
  }
  if (enabled(filter, 'wiki')) {
    runners.push({
      type: 'wiki',
      run: async () =>
        (await queryWikiByCustomerAndTitle(customerId, term)).map((w) => wikiToItem(w, term)),
    });
  }
  if (enabled(filter, 'projects')) {
    runners.push({
      type: 'projects',
      run: async () =>
        (await queryProjectsByCustomerAndTitle(customerId, term)).map((p) => projectToItem(p, term)),
    });
  }
  if (enabled(filter, 'people')) {
    runners.push({
      type: 'people',
      run: async () =>
        (await queryMembersByCustomerAndName(customerId, term)).map((m) => memberToItem(m, term)),
    });
  }

  const settled = await Promise.allSettled(runners.map((r) => r.run()));

  const groups: SearchGroup[] = [];
  const partialFailures: Array<{ type: SearchEntityType; reason: string }> = [];

  settled.forEach((s, i) => {
    const r = runners[i]!;
    if (s.status === 'fulfilled') {
      const items = sortByScoreDesc(s.value.filter((it) => it.score > 0)).slice(0, 8);
      if (items.length > 0) {
        groups.push({ type: r.type, count: items.length, items });
      }
    } else {
      const reason = s.reason instanceof Error ? s.reason.message : String(s.reason);
      partialFailures.push({ type: r.type, reason });
    }
  });

  return {
    query: term,
    filter,
    tookMs: Date.now() - started,
    groups,
    ...(partialFailures.length > 0 ? { partialFailures } : {}),
  };
}
