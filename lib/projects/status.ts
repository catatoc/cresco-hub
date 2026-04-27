import type { ProjectStatus } from '@/schemas/project';

export type ProjectStatusStyle = {
  bg: string;
  text: string;
  dot: string;
  progress: string;
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, ProjectStatusStyle> = {
  Backlog:       { bg: 'bg-white border border-border', text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]', progress: 'bg-[#a0a0a8]' },
  Planning:      { bg: 'bg-[#eeeffc]',                  text: 'text-[#5e6ad2]',         dot: 'bg-[#5e6ad2]', progress: 'bg-[#5e6ad2]' },
  'In Progress': { bg: 'bg-[#eff6ff]',                  text: 'text-[#3a5fcc]',         dot: 'bg-[#3a5fcc]', progress: 'bg-[#3a5fcc]' },
  Paused:        { bg: 'bg-[#faf0db]',                  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]', progress: 'bg-[#c78a2c]' },
  Done:          { bg: 'bg-[#e8f5ec]',                  text: 'text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]', progress: 'bg-[#3f9f5c]' },
  Canceled:      { bg: 'bg-[#fceaea]',                  text: 'text-[#d24949]',         dot: 'bg-[#d24949]', progress: 'bg-[#d24949]' },
};

export const PROJECT_ACCENTS = [
  'from-[#5e6ad2] to-[#7c5fd0]',
  'from-[#c78a2c] to-[#d24949]',
  'from-[#3f9f5c] to-[#6da88e]',
  'from-[#8ba1d9] to-[#a07ac9]',
];

export const PROJECT_ICON_BG = [
  'bg-[#eeeffc] text-[#5e6ad2]',
  'bg-[#faf0db] text-[#c78a2c]',
  'bg-[#e8f5ec] text-[#3f9f5c]',
  'bg-[#f4ecf8] text-[#7f3aa7]',
];
