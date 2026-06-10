import { z } from 'zod';

export const customerStatusSchema = z.enum(['Lead', 'Active', 'At Risk', 'Paused', 'Churned']);
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const customerTypeSchema = z.enum(['Prospect', 'Customer', 'Partner', 'Personal']);
export type CustomerType = z.infer<typeof customerTypeSchema>;

export const customerIconSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('emoji'), value: z.string() }),
  z.object({ type: z.literal('image'), value: z.string().url() }),
]);
export type CustomerIcon = z.infer<typeof customerIconSchema>;

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: customerIconSchema.nullable(),
  status: customerStatusSchema.nullable(),
  type: customerTypeSchema.nullable(),
  logo: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;
