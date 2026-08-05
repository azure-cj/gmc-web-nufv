import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.string().optional().default('3001'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  STORAGE_PATH: z.string().min(1),
  NODE_ENV: z.string().optional().default('development')
})

export type Env = z.infer<typeof EnvSchema>

export const env: Env = (() => {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const err = parsed.error.flatten().fieldErrors
    throw new Error(`Invalid or missing environment variables: ${JSON.stringify(err)}`)
  }
  return parsed.data
})()
