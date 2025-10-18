import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000/api'),
  VITE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_GA_TRACKING_ID: z.string().optional(),
});

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Invalid environment variables');
  }
}

export const env = parseEnv();

// Helper functions
export const isDevelopment = env.VITE_ENV === 'development';
export const isProduction = env.VITE_ENV === 'production';
export const isStaging = env.VITE_ENV === 'staging';
