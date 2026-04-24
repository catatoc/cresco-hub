import { z } from 'zod';

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  clientId: z.string().nullable(),
  projectIds: z.array(z.string()),
  role: z.string().nullable(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
