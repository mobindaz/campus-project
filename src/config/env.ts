import { z } from "zod";

const envSchema = z.object({
  // Phase 0: Core & Database
  DATABASE_URL: z
    .string({ message: "DATABASE_URL environment variable is required." })
    .min(1, "DATABASE_URL cannot be empty")
    .url("DATABASE_URL must be a valid connection URL (e.g. postgresql://user:pass@host:5432/db)"),

  APP_URL: z
    .string()
    .url("APP_URL must be a valid URL")
    .default("http://localhost:3000"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Phase 1: Auth & Sessions
  AUTH_SECRET: z
    .string({ message: "AUTH_SECRET environment variable is required." })
    .min(32, "AUTH_SECRET must be at least 32 characters long"),

  // Phase 8: Email & Jobs (Optional in Phase 0)
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("noreply@campusops.dev"),
  INNGEST_EVENT_KEY: z.string().optional().default(""),
  INNGEST_SIGNING_KEY: z.string().optional().default(""),

  // Phase 10: R2 Storage (Optional in Phase 0)
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET_NAME: z.string().optional().default("campus-ops-files-dev"),
  R2_PUBLIC_DOMAIN: z.string().optional().default(""),

  // Phase 10: Upstash Redis Rate Limiting (Optional in Phase 0)
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid Environment Variables:\n",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
    );
    throw new Error(
      "Environment validation failed. Check your .env file against .env.example"
    );
  }

  return parsed.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
