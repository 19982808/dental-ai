// api/chat.js — Vercel serverless function (Groq)

export default async function handler(req, res) {

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  // ── Check API key is present ──────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in environment variables");
    return res.status(500).json({
      error: { message: "GROQ_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables, then redeploy." }
    });
  }

  // ── Validate request body ─────────────────────
  const { model, messages, temperature, max_tokens } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: "No messages provided in request body." } });
  }

  // ── Call Groq ─────────────────────────────────
  try {
    const body = {
      model:       model       || "llama-3.3-70b-versatile",
      messages:    messages,
      temperature: temperature || 0.75,
      max_tokens:  max_tokens  || 300,
      // Do NOT include frequency_penalty or presence_penalty — not supported by Groq llama3
    };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error("Groq API error:", groqRes.status, JSON.stringify(data));
      return res.status(groqRes.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler fetch error:", err.message);
    return res.status(500).json({ error: { message: `Server error: ${err.message}` } });
  }
}
