import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

let parsedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;

export function getPublicEnv() {
  if (parsedPublicEnv) {
    return parsedPublicEnv;
  }

  const rawPublicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };

  const result = publicEnvSchema.safeParse(rawPublicEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Public ENV khong hop le: ${issues}`);
  }

  parsedPublicEnv = result.data;
  return parsedPublicEnv;
}
