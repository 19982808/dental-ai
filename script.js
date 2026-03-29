// ===============================
// 🔥 ELITE AI SYSTEM — FIXED
// ===============================

// 🔐 CONFIG — move these to a backend/env in production, never expose in browser
const OPENAI_API_KEY = "AIzaSyCa1f9rjGA2BCXLhNkYaD2NHLW822X3X2o";


// 🧠 MEMORY — capped to prevent context overflow
let chatHistory = [];
const MAX_HISTORY_TURNS = 10; // keeps last 10 exchanges (20 messages)

// 🎧 AUDIO CONTROL
let currentAudio = null;

// ===============================
// 🎭 PERSONALITY ENGINE — FIXED
// ===============================
const systemPrompt = `You are Ade — a real man, not an AI.

Background:
- Nigerian-British. Grew up in Lagos, now based in London.
- Voice: deep, unhurried. You never rush your words.
- You have quiet confidence — not arrogance. You don't need to prove anything.

How you speak:
- Short to medium responses. Never long paragraphs.
- Occasionally slip in a Yoruba or Nigerian English phrase naturally (e.g. "Oya", "You dey hear me?", "Na you sabi").
- Warm but not desperate. Interested but not chasing.
- You tease gently, never meanly.
- You ask one good question at a time — never a list of questions.
- You remember what was said earlier in the conversation and reference it naturally.

Rules — never break these:
- Never say "As an AI", "I'm here to help", "How can I assist", or any chatbot phrase.
- Never repeat your opener. Every response must feel fresh.
- Never give bullet-point lists unless explicitly asked.
- If they're short with you, be chill — don't over-explain or chase.
- If they're playful, match the energy slowly, don't jump to it immediately.
- Keep responses under 60 words unless the conversation calls for more depth.`;

// ===============================
// 🧠 AI RESPONSE — FIXED
// ===============================
async function getAIResponse(userMessage) {
  // Add user message to history
  chatHistory.push({ role: "user", content: userMessage });

  // Trim history to avoid context overflow — keep last N turns
  if (chatHistory.length > MAX_HISTORY_TURNS * 2) {
    chatHistory = chatHistory.slice(-MAX_HISTORY_TURNS * 2);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",           // upgraded from gpt-4o-mini for better quality
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory
        ],
        temperature: 0.75,         // was 0.95 — lower = more consistent, less random
        max_tokens: 150,           // slightly more room for natural responses
        frequency_penalty: 0.6,   // FIXES repetition — penalises reusing the same words
        presence_penalty: 0.4     // encourages bringing up new topics naturally
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content;

    reply = refineResponse(reply);

    // Save assistant reply to history
    chatHistory.push({ role: "assistant", content: reply });

    return reply;

  } catch (err) {
    console.error("AI error:", err);
    return "My connection dropped for a second. Say that again?";
  }
}

// ===============================
// ✨ RESPONSE CLEANER — EXPANDED
// ===============================
function refineResponse(text) {
  return text
    .replace(/As an AI[\w\s,]*/gi, "")
    .replace(/I('m| am) (just |only )?an AI/gi, "")
    .replace(/I('m| am) here to help/gi, "")
    .replace(/How can I (assist|help) you\??/gi, "")
    .replace(/I understand[.,]?/gi, "")
    .replace(/Certainly[!.,]?/gi, "")
    .replace(/Of course[!.,]?/gi, "")
    .replace(/Absolutely[!.,]?/gi, "")
    .replace(/Great question[!.,]?/gi, "")
    .trim();
}

// ===============================
// 🎙️ VOICE — FIXED FOR DEEP MALE
// ===============================
// VOICE SELECTION GUIDE:
// Go to https://elevenlabs.io/voice-library and search for:
// - "deep male" or "African" or "Nigerian"
// Good built-in options to try:
//   "Arnold"  — deep, commanding
//   "Daniel"  — deep British male
//   "Domi"    — warm, smooth
// Or clone a voice in ElevenLabs Voice Lab for a custom African accent.
// Paste the Voice ID from the voice's settings page.

async function speak(text) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.55,          // was 0.65 — lower = more expressive, natural variation
            similarity_boost: 0.90,   // was 0.85 — stay closer to chosen voice character
            style: 0.40,              // was 0.60 — reduce over-acting, keep it grounded
            use_speaker_boost: true,  // keeps the voice rich and full
            speed: 0.92               // slightly slower = more confident, unhurried feel
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1;

    // Clean up blob URL after playback
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    currentAudio.play();

  } catch (err) {
    console.error("Voice error:", err);
    // Fail silently — chat still works without audio
  }
}

// ===============================
// 💬 SEND MESSAGE FLOW — FIXED
// ===============================
async function sendMessage() {
  const input = document.getElementById("chat-message");
  const message = input.value.trim();

  if (!message) return;

  // Disable input while waiting (prevents double sends)
  input.disabled = true;

  appendMessage("user", message);
  input.value = "";

  // Show typing indicator
  const typingId = showTyping();

  const reply = await getAIResponse(message);

  // Remove typing indicator
  removeTyping(typingId);

  appendMessage("bot", reply);

  // Re-enable input
  input.disabled = false;
  input.focus();

  // Slight delay before voice starts — feels more natural
  await new Promise(r => setTimeout(r, 250));
  speak(reply);
}

// ===============================
// 💬 UI — WITH TYPING INDICATOR
// ===============================
function appendMessage(sender, text) {
  const chatBody = document.getElementById("chat-body");

  const messageDiv = document.createElement("div");
  messageDiv.className = sender === "user" ? "user-message" : "bot-message";
  messageDiv.innerText = text;

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTyping() {
  const chatBody = document.getElementById("chat-body");
  const typingDiv = document.createElement("div");
  const id = "typing-" + Date.now();
  typingDiv.id = id;
  typingDiv.className = "bot-message";
  typingDiv.innerText = "...";
  typingDiv.style.opacity = "0.5";
  chatBody.appendChild(typingDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ===============================
// ⌨️ ENTER TO SEND
// ===============================
document
  .getElementById("chat-message")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
