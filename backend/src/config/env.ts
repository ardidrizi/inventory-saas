import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required').optional(),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').optional(),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const mongoUri = parsed.data.MONGO_URI ?? parsed.data.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Invalid environment variables:');
  console.error('  MONGO_URI: MONGO_URI (or legacy MONGODB_URI) is required');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  MONGO_URI: mongoUri,
};
