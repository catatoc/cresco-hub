import { z } from 'zod';

export const customerStatusSchema = z.enum(['Lead', 'Active', 'At Risk', 'Paused', 'Churned']);
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const customerTypeSchema = z.enum(['Prospect', 'Customer', 'Partner', 'Personal']);
export type CustomerType = z.infer<typeof customerTypeSchema>;

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  status: customerStatusSchema.nullable(),
  type: customerTypeSchema.nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
