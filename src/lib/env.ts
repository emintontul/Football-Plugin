import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url({ message: 'VITE_API_BASE_URL must be a valid URL' }),
  VITE_MOCK_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .catch('false'),
});

function parseEnv() {
  const result = EnvSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_MOCK_MODE: import.meta.env.VITE_MOCK_MODE,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([k, v]) => `  ${k}: ${v?.join(', ')}`)
      .join('\n');
    throw new Error(`[env] Invalid environment variables:\n${messages}`);
  }

  return result.data;
}

export const env = parseEnv();
