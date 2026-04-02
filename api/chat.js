// ================================================
// RYNAR BACKEND — /api/chat.js
// ================================================

// Optional (only needed for local dev)
import dotenv from "dotenv";
dotenv.config();

export default async function handler(req, res) {
  // ── Only POST allowed ──
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: "Method not allowed" }
    });
  }

  // ── API KEY (comes from .env or Vercel) ──
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: {
        message: "Missing GROQ_API_KEY. Add it to your environment variables."
      }
    });
  }

  try {
    const {
      model,
      messages,
      temperature,
      max_tokens,
      frequency_penalty,
      presence_penalty
    } = req.body;

    // ── FORCE BETTER MODEL (upgrade automatically) ──
    const finalModel = model === "llama3-8b-8192"
      ? "llama3-70b-8192"
      : (model || "llama3-70b-8192");

    // ── CALL GROQ ──
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: finalModel,
        messages,
        temperature: temperature ?? 0.8,
        max_tokens: max_tokens ?? 300,
        frequency_penalty: frequency_penalty ?? 0.5,
        presence_penalty: presence_penalty ?? 0.3
      })
    });

    const data = await response.json();

    // ── HANDLE ERRORS CLEANLY ──
    if (!response.ok) {
      console.error("Groq API Error:", data);
      return res.status(response.status).json({
        error: {
          message: data?.error?.message || "AI request failed"
        }
      });
    }

    // ── RETURN EXACT FORMAT YOUR FRONTEND EXPECTS ──
    return res.status(200).json(data);

  } catch (err) {
    console.error("Server crash:", err);

    return res.status(500).json({
      error: {
        message: "Server error — check logs",
        details: err.message
      }
    });
  }
}
