import { z } from 'zod';

export const notionIdSchema = z.string().min(10);

export const richTextToPlain = (rich: Array<{ plain_text: string }> | undefined) =>
  rich?.map((r) => r.plain_text).join('') ?? '';

export const titleSchema = z.array(z.object({ plain_text: z.string() })).transform(richTextToPlain);

export const selectSchema = z.object({ name: z.string() }).nullable();
export const multiSelectSchema = z.array(z.object({ name: z.string(), color: z.string().optional() }));
export const relationSchema = z.array(z.object({ id: z.string() }));
export const dateSchema = z.object({ start: z.string(), end: z.string().nullable() }).nullable();
export const emailSchema = z.string().nullable();
