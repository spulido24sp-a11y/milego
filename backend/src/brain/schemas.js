import { z } from 'zod';

export const aiResponseSchema = z.object({
  marketScore: z.number().int().min(0).max(100).default(80),
  recommendedOffer: z.string().default('combo_x2'),
  seo: z.object({
    title: z.string().max(100),
    slug: z.string(),
    keywords: z.array(z.string()).default([])
  }),
  recommendedHooks: z.array(z.string()).min(1).default([
    'Última tecnología al mejor precio.',
    'Paga contra entrega en todo el país.'
  ])
});
