import { z } from 'zod';

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user']),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});
