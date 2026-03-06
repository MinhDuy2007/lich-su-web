import { getEnv } from "@/lib/env";

interface GeminiGeneratePayload {
  prompt: string;
}

export async function callGeminiGenerate({ prompt }: GeminiGeneratePayload) {
  const env = getEnv();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });
  } catch {
    throw new Error("Không kết nối được đến Google AI");
  }

  if (!response.ok) {
    let message = `Gemini loi HTTP ${response.status}`;
    try {
      const errorPayload = (await response.json()) as {
        error?: { message?: string };
      };
      if (errorPayload.error?.message) {
        message = errorPayload.error.message;
      }
    } catch {
      const rawText = await response.text();
      if (rawText.trim()) {
        message = rawText.slice(0, 300);
      }
    }
    throw new Error(message);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const output =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
    "";
  return output.trim();
}
