import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  endDate: z.string().nullable(),
  meetUrl: z.string().nullable(),
  recurrence: z.string().nullable(),
  facilitatorId: z.string().nullable(),
  attendeeIds: z.array(z.string()),
  clientId: z.string().nullable(),
  actionItemIds: z.array(z.string()),
  url: z.string().url(),
});

export type Meeting = z.infer<typeof meetingSchema>;
