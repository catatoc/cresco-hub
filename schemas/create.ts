import { z } from 'zod';
import { taskPrioritySchema } from './task';
import { wikiCategorySchema } from './wiki';

export const createTaskInput = z.object({
  type: z.literal('task'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  sprintId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).default([]), // Team relation
  priority: taskPrioritySchema.nullable().optional(),
  dueDate: z.string().date().nullable().optional(), // YYYY-MM-DD
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const createWikiInput = z.object({
  type: z.literal('wiki'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  emoji: z.string().max(8).default('📄'),
  categories: z.array(wikiCategorySchema).default([]),
  projectId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
});
export type CreateWikiInput = z.infer<typeof createWikiInput>;

export const createInput = z.discriminatedUnion('type', [
  createTaskInput,
  createWikiInput,
]);
export type CreateInput = z.infer<typeof createInput>;

export const createResult = z.object({
  id: z.string(),
  url: z.string(),
});
export type CreateResult = z.infer<typeof createResult>;
