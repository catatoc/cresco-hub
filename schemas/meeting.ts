import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  endDate: z.string().nullable(),
  meetingType: z.string().nullable(),
  summary: z.string().nullable(),
  attendeeIds: z.array(z.string()),       // Notion user IDs (not Team IDs)
  customerId: z.string().nullable(),
  projectIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  taskIds: z.array(z.string()),           // the action items
  wikiIds: z.array(z.string()),
  url: z.string().url(),
});
export type Meeting = z.infer<typeof meetingSchema>;
