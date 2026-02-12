import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  category: z.string().min(1),
});

export const updateProductSchema = createProductSchema.partial();
