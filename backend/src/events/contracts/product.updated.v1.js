import { z } from 'zod';
export const productUpdatedV1 = z.object({
  name: z.string(),
  slug: z.string(),
  price: z.number().int(),
  store_id: z.number().int(),
  status: z.string().optional(),
  old_values: z.record(z.any()).optional(),
});
