import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_GEMINI_API_KEY: optionalNonEmptyString,
  APP_URL: z.string().url().optional(),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SEED_DEFAULT_PASSWORD: z.string().min(8).optional(),
  SEED_ALLOW_PRODUCTION: z
    .string()
    .transform((value) => value === "true")
    .optional(),
  SEED_INCLUDE_SAMPLE_DATA: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables");
  }
}

export const env = parsedEnv.success
  ? parsedEnv.data
  : (process.env as unknown as z.infer<typeof envSchema>);

export function isProductionLikeEnvironment() {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

export function isStagingLikeEnvironment() {
  return env.APP_ENV === "staging";
}
