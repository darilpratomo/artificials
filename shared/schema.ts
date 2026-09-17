import { z } from 'zod';
const identifier = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,31}$/)
  .refine(
    (x) =>
      ![
        'id',
        'user_id',
        'created_at',
        'updated_at',
        '__proto__',
        'constructor',
        'prototype',
      ].includes(x),
  );
export const fieldSchema = z.object({
  name: identifier,
  type: z.enum(['text', 'number', 'boolean']),
  required: z.boolean(),
});
export const collectionSchema = z
  .object({ name: identifier, fields: z.array(fieldSchema).min(1).max(12) })
  .refine((c) => new Set(c.fields.map((f) => f.name)).size === c.fields.length);
export const artifactSchema = z
  .object({
    title: z.string().min(1).max(100),
    description: z.string().max(500),
    app: z.string().min(80).max(90000),
    css: z.string().min(10).max(40000),
    preview: z.string().min(40).max(50000),
    collections: z.array(collectionSchema).min(1).max(8),
    notes: z.array(z.string().max(1000)).max(12),
  })
  .refine((a) => new Set(a.collections.map((c) => c.name)).size === a.collections.length);
export type Artifact = z.infer<typeof artifactSchema>;
export const artifactJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'app', 'css', 'preview', 'collections', 'notes'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    app: { type: 'string' },
    css: { type: 'string' },
    preview: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
    collections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'fields'],
        properties: {
          name: { type: 'string' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'type', 'required'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['text', 'number', 'boolean'] },
                required: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};
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
