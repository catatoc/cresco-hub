import { z } from 'zod';

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  area: z.string().nullable(),
  customerIds: z.array(z.string()), // from "Customers" relation (plural)
  projectIds: z.array(z.string()),  // from "Projects" relation
  portalSignIn: z.boolean().default(false), // from "Portal Sign In" checkbox — ya entró al portal alguna vez
  gender: z.enum(['Male', 'Female']).nullable().default(null), // from "Gender" select — saludos con género (bienvenido/bienvenida)
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
