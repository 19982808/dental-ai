// api/chat.js — Vercel serverless function
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
    console.error("GROQ_API_KEY not set in environment variables.");
    return res.status(500).json({ error: { message: "GROQ_API_KEY not set." } });
  }

  try {
    const { model, messages, temperature, max_tokens } = req.body;

    const body = {
      model: model || "llama3-8b-8192",
      messages: messages,
      temperature: temperature || 0.75,
      max_tokens: max_tokens || 300,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq error response:", errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: { message: err.message } });
  }
}
