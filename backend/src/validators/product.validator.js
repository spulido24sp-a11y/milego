import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(300),
  slug: z.string().min(1, 'Slug requerido').max(300),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  category_id: z.number().int().optional(),
  price: z.number().int().min(0, 'Precio debe ser mayor a 0'),
  compare_price: z.number().int().optional(),
  sku: z.string().max(100).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  stock: z.number().int().default(0),
  is_featured: z.boolean().default(false),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  launch_blueprint: z.any().optional(),
});

export const updateProductSchema = createProductSchema.partial();
