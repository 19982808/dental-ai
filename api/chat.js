// api/chat.js — Vercel serverless function
// Groq backend — fixed version

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: { message: "GROQ_API_KEY not set in environment variables." } });
  }

  try {
    // Pull what the frontend sends — don't override model here
    // so diagnosis calls can request more tokens
    const { model, messages, temperature, max_tokens } = req.body;

    // Strip unsupported params for Groq (frequency_penalty, presence_penalty not supported)
    const body = {
      model:       model || "llama3-8b-8192",
      messages:    messages,
      temperature: temperature || 0.75,
      max_tokens:  max_tokens  || 300,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: { message: err.message } });
  }
}
