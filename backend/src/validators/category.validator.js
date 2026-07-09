import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  slug: z.string().min(1, 'Slug requerido').max(200),
  description: z.string().optional(),
  parent_id: z.number().int().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
