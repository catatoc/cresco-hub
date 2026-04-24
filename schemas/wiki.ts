import { z } from 'zod';

export const wikiCategorySchema = z.enum([
  'Proposal',
  'Customer research',
  'Strategy doc',
  'Planning',
  'Documentation',
]);
export type WikiCategory = z.infer<typeof wikiCategorySchema>;

export const wikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  cover: z.string().nullable(),
  categories: z.array(wikiCategorySchema),
  customerId: z.string().nullable(),
  projectIds: z.array(z.string()),
  meetingIds: z.array(z.string()),
  lastEditedAt: z.string(),
  url: z.string().url(),
});
export type WikiPage = z.infer<typeof wikiPageSchema>;
