import { z } from 'zod';
export const userLoginV1 = z.object({
  email: z.string().email(),
  userId: z.number().int(),
});
