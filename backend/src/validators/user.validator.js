import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role_id: z.number().int(),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial();
