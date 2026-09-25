import { z } from 'zod';
export const articleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  title: z.string().min(5).max(180),
  excerpt: z.string().min(20).max(350),
  category: z.enum(['AI models', 'Research', 'Engineering', 'Industry', 'Guides']),
  body: z.string().min(100).max(50000),
  published: z.boolean(),
});
