import type { Task } from '@/schemas/task';

export const PRIORITY_COLOR: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#5e6ad2',
  Low: '#8a8a91',
};

/** Maps a Notion priority value to its message key under `kanban.priority`. */
export const PRIORITY_KEY: Record<string, string> = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

export const TAG_MAP: Record<string, string> = {
  Mobile: 'bg-[#eef4ff] text-[#3a5fcc]',
  Website: 'bg-[#f0f4e6] text-[#556c1d]',
  Improvement: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Marketing: 'bg-[#fceaea] text-[#a92f2f]',
  Research: 'bg-[#eeeffc] text-[#5e6ad2]',
  Branding: 'bg-[#faf0db] text-[#c78a2c]',
  Metrics: 'bg-[#e8f5ec] text-[#3f9f5c]',
  Meeting: 'bg-[#f7f7f8] text-[#57575c]',
  Email: 'bg-[#f7f7f8] text-[#57575c]',
  'Video production': 'bg-[#f4ecf8] text-[#7f3aa7]',
};

export function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority] ?? '#8a8a91';
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Low' ? 10 : 6}
        width="4"
        height={priority === 'Low' ? 12 : 16}
        opacity={priority === 'Low' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'High' ? 6 : 2}
        width="4"
        height={priority === 'High' ? 16 : 20}
        opacity={priority === 'High' ? 1 : 0.3}
      />
    </svg>
  );
}
