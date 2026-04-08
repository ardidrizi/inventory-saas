import './loadEnv';

import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGO_URI: z.string({ required_error: 'MONGO_URI is required' }).trim().min(1).optional(),
    MONGODB_URI: z.string().trim().min(1).optional(),
    JWT_SECRET: z
      .string({ required_error: 'JWT_SECRET is required' })
      .min(10, 'JWT_SECRET must be at least 10 characters'),
    OPENAI_API_KEY: z.string().trim().min(1, 'OPENAI_API_KEY must not be empty').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.MONGO_URI && !data.MONGODB_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGO_URI'],
        message: 'MONGO_URI (or legacy MONGODB_URI) is required',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export type Env = z.infer<typeof envSchema> & {
  MONGO_URI: string;
};

export const env: Env = {
  ...parsed.data,
  MONGO_URI: parsed.data.MONGO_URI ?? parsed.data.MONGODB_URI!,
};
