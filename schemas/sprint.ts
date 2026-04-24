import { z } from 'zod';

export const sprintStatusSchema = z.enum(['Current', 'Next', 'Future', 'Last', 'Past']);
export type SprintStatus = z.infer<typeof sprintStatusSchema>;

export const sprintSchema = z.object({
  id: z.string(),
  sprintId: z.number().nullable(),
  name: z.string(),
  status: sprintStatusSchema.nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export type Sprint = z.infer<typeof sprintSchema>;
