import { z } from 'zod';

/* Validated at import time (main.jsx imports this before rendering) so a
   missing/misconfigured .env fails fast with a readable message instead of
   surfacing as a cryptic runtime error deep in a fetch call. */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1, 'VITE_APP_NAME is required'),
  VITE_API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
  VITE_NEXORA_ORIGIN: z.string().optional().default(''),
  VITE_AUTH_CLIENT_ID: z.string().optional().default(''),
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
});

function loadEnv() {
  const result = envSchema.safeParse(import.meta.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCheck frontend/.env against frontend/.env.example.`
    );
  }
  return result.data;
}

export const env = loadEnv();
