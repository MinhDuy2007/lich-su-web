import { ZodSchema } from "zod";

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const json = await request.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      return {
        data: null,
        error: result.error.issues.map((i) => i.message).join("; ")
      };
    }

    return { data: result.data, error: null };
  } catch {
    return { data: null, error: "Payload JSON không hợp lệ" };
  }
}

