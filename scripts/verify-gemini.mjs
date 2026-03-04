const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!apiKey) {
  console.error("THIEU_GEMINI_API_KEY");
  process.exit(1);
}

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [{ text: "Tra loi 1 tu: OK" }]
      }
    ]
  })
});

if (!response.ok) {
  const text = await response.text();
  console.error("GEMINI_FAIL", text);
  process.exit(1);
}

const payload = await response.json();
const answer =
  payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

console.log("GEMINI_OK");
console.log("ANSWER:", answer.slice(0, 80));
