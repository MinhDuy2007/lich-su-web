import { z } from "zod";

const coreEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(32),
  OTP_PEPPER: z.string().min(16),
  GEMINI_API_KEY: z.string().min(20),
  GEMINI_MODEL: z.string().default("gemma-3-27b-it"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional()
});

let parsedEnv: z.infer<typeof coreEnvSchema> | null = null;

export function getEnv() {
  if (parsedEnv) {
    return parsedEnv;
  }

  const result = coreEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`ENV khong hop le: ${issues}`);
  }

  parsedEnv = result.data;
  return parsedEnv;
}
