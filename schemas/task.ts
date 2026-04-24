import { z } from 'zod';

export const taskStatusSchema = z.enum(['Backlog', 'Por hacer', 'En progreso', 'Hecho']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(['Baja', 'Media', 'Alta', 'Urgente']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  title: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema.nullable(),
  assigneeIds: z.array(z.string()),
  projectId: z.string().nullable(),
  clientId: z.string().nullable(),
  cycle: z.string().nullable(),
  dueDate: z.string().nullable(),
  labels: z.array(z.string()),
  url: z.string().url(),
});

export type Task = z.infer<typeof taskSchema>;
