import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });
dotenv.config();

const envSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  APP_URL: z.string().url().optional(),
  SEED_DEFAULT_PASSWORD: z.string().min(8).optional(),
  SEED_INCLUDE_SAMPLE_DATA: z.string().optional(),
  SEED_ALLOW_PRODUCTION: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Invalid configuration:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;
const databaseUrl = new URL(env.DATABASE_URL.replace(/^["'](.+)["']$/, "$1"));

console.log("[env] Configuration looks valid.");
console.log(`[env] APP_ENV: ${env.APP_ENV}`);
console.log(`[env] DATABASE host: ${databaseUrl.hostname}`);
console.log(`[env] DATABASE port: ${databaseUrl.port || "5432"}`);
console.log(`[env] DATABASE name: ${databaseUrl.pathname.replace(/^\//, "")}`);
console.log(`[env] NEXTAUTH_URL: ${env.NEXTAUTH_URL}`);
console.log(`[env] APP_URL: ${env.APP_URL ?? env.NEXTAUTH_URL}`);
console.log(`[env] Sample seed enabled: ${env.SEED_INCLUDE_SAMPLE_DATA ?? "not set"}`);
