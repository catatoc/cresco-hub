export type SearchEntityType = 'tasks' | 'meetings' | 'wiki' | 'projects' | 'people';
export type SearchFilter = 'all' | SearchEntityType;

export type SearchItem = {
  id: string;
  type: 'task' | 'meeting' | 'wiki' | 'project' | 'person';
  title: string;
  url: string;
  meta: {
    status?: string | null;
    date?: string | null;
    projectName?: string | null;
    priority?: string | null;
    emoji?: string | null;
    avatarInitials?: string | null;
  };
  score: number;
};

export type SearchGroup = {
  type: SearchEntityType;
  count: number;
  items: SearchItem[];
};

export type SearchResponse = {
  query: string;
  filter: SearchFilter;
  tookMs: number;
  groups: SearchGroup[];
  partialFailures?: Array<{ type: SearchEntityType; reason: string }>;
};

export type SuggestionsResponse = {
  todayMeeting: { id: string; title: string; date: string } | null;
  dueToday: { count: number; firstThree: SearchItem[] } | null;
  activeSprint: { id: string; name: string; daysLeft: number | null } | null;
};
