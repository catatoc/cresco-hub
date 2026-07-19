import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'Backlog',
  'Planning',
  'Starting',
  'In Progress',
  'Paused',
  'Done',
  'Canceled',
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectPrioritySchema = z.enum(['Low', 'Medium', 'High']);
export type ProjectPriority = z.infer<typeof projectPrioritySchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  summary: z.string().nullable(),
  repoUrl: z.string().url().nullable(),
  designUrl: z.string().url().nullable(),
  status: projectStatusSchema.nullable(),
  priority: projectPrioritySchema.nullable(),
  completion: z.number().nullable(), // 0..1 rollup
  ownerIds: z.array(z.string()),     // Notion user IDs
  customerId: z.string().nullable(),
  teamIds: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  url: z.string().url(),
});
export type Project = z.infer<typeof projectSchema>;
