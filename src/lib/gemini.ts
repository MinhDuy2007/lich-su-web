import { getEnv } from "@/lib/env";

interface GeminiGeneratePayload {
  apiKey: string;
  prompt: string;
}

export async function callGeminiGenerate({
  apiKey,
  prompt
}: GeminiGeneratePayload) {
  const env = getEnv();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini loi: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
    ""
  );
}

