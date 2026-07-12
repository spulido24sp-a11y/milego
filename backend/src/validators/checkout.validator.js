import { z } from 'zod';

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'El nombre del cliente debe tener al menos 2 caracteres'),
    email: z.string().email('Email de cliente inválido').optional().nullable().or(z.literal('')),
    phone: z.string().min(7, 'El teléfono del cliente debe tener al menos 7 dígitos'),
    document_type: z.string().optional().nullable(),
    document_number: z.string().optional().nullable(),
  }),
  shipping_address: z.object({
    street: z.string().min(3, 'La dirección de envío es obligatoria'),
    city: z.string().min(2, 'La ciudad de envío es obligatoria'),
    state: z.string().min(2, 'El departamento de envío es obligatorio'),
    zip_code: z.string().optional().nullable(),
    country: z.string().default('Colombia'),
  }),
  items: z.array(
    z.object({
      product_id: z.number().int().positive('ID de producto inválido'),
      variant_id: z.number().int().positive('ID de variante de producto inválido').optional().nullable(),
      quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
    })
  ).min(1, 'Debe incluir al menos un producto en el pedido'),
  payment_method: z.string().default('cash_on_delivery'),
  notes: z.string().optional().nullable(),
  whatsapp_opt_in: z.boolean().default(false),
});
