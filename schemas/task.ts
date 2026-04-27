import { z } from 'zod';

export const taskStatusSchema = z.enum([
  'Refining',
  'Not Started',
  'In Progress',
  'Testing',
  'In Review',
  'Done',
  'Archived',
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskTypeSchema = z.enum([
  '🗓️ Meeting',
  '📖 Research',
  '✅ Task',
  '🏥 Quality',
  '🐛 Bug',
]);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema.nullable(),
  type: taskTypeSchema.nullable(),
  assigneeIds: z.array(z.string()), // Notion user IDs
  projectId: z.string().nullable(),
  customerId: z.string().nullable(),
  sprintId: z.string().nullable(),
  dueDate: z.string().nullable(),          // Due
  plannedDate: z.string().nullable(),      // Planned
  completedAt: z.string().nullable(),      // Completed on
  tags: z.array(z.string()),
  progress: z.number().nullable(),         // 0..1
  url: z.string().url(),
});
export type Task = z.infer<typeof taskSchema>;
