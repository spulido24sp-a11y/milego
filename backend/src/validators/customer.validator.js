import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  document_type: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createAddressSchema = z.object({
  label: z.string().optional().nullable(),
  street: z.string().min(3, 'La dirección es obligatoria'),
  city: z.string().min(2, 'La ciudad es obligatoria'),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  country: z.string().default('Colombia'),
  is_default: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const createCustomerNoteSchema = z.object({
  note: z.string().min(1, 'La nota no puede estar vacía'),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email('Email inválido'),
});
