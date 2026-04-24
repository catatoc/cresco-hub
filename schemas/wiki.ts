import { z } from 'zod';

export const wikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  cover: z.string().nullable(),
  parentId: z.string().nullable(),
  clientId: z.string().nullable(),
  ownerId: z.string().nullable(),
  tags: z.array(z.string()),
  lastEditedAt: z.string(),
  url: z.string().url(),
});

export type WikiPage = z.infer<typeof wikiPageSchema>;
