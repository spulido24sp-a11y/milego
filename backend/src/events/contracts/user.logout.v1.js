import { z } from 'zod';
export const userLogoutV1 = z.object({
  email: z.string().email(),
  userId: z.number().int(),
});
