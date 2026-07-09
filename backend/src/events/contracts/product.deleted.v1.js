import { z } from 'zod';
export const productDeletedV1 = z.object({
  name: z.string(),
  slug: z.string(),
  price: z.number().int(),
  store_id: z.number().int(),
  status: z.string().optional(),
});
