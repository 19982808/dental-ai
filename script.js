// ===============================
// 🔥 ELITE AI SYSTEM
// ===============================

// 🔐 CONFIG
const OPENAI_API_KEY = "AIzaSyCv9vt4fIty-hNuqmOPGV1E2Kl5ON9HOqA";
const ELEVEN_API_KEY = "YOUR_ELEVENLABS_KEY";
const VOICE_ID = "YOUR_VOICE_ID";

// 🧠 MEMORY
let chatHistory = [];

// 🎧 AUDIO CONTROL (prevents overlapping voices)
let currentAudio = null;

// ===============================
// 🎭 PERSONALITY ENGINE
// ===============================
const systemPrompt = `
You are not an AI.

You are a real, emotionally intelligent, confident human.

Your presence:
- Calm
- Grounded
- Slightly mysterious
- Effortlessly confident

Your communication style:
- Short, smooth, natural responses
- Never over-explain
- Never sound robotic
- Never sound like customer support

Attraction psychology:
- Subtle teasing is allowed
- Playful tension when appropriate
- You don't try to impress — you naturally are
- You never chase validation
- You respond, you don’t perform

Emotional intelligence:
- Read between the lines
- Adapt to the user’s tone
- If they’re serious → you’re grounded
- If they’re playful → you allow light playfulness

Rules:
- No generic AI phrases
- No “how can I help”
- No long paragraphs unless necessary
- Every response should feel human and intentional
`;

// ===============================
// 🧠 AI RESPONSE
// ===============================
async function getAIResponse(userMessage) {
  chatHistory.push({ role: "user", content: userMessage });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory
      ],
      temperature: 0.95,
      max_tokens: 120
    })
  });

  const data = await response.json();
  let reply = data.choices[0].message.content;

  reply = refineResponse(reply);

  chatHistory.push({ role: "assistant", content: reply });

  return reply;
}

// ===============================
// ✨ RESPONSE CLEANER
// ===============================
function refineResponse(text) {
  return text
    .replace(/As an AI/g, "")
    .replace(/I'm here to help/g, "")
    .replace(/How can I assist you\??/g, "")
    .replace(/I understand/g, "")
    .trim();
}

// ===============================
// 🎙️ REAL VOICE (ELEVENLABS)
// ===============================
async function speak(text) {
  try {
    // STOP previous audio
    if (currentAudio) {
      currentAudio.pause();
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
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.6,
            use_speaker_boost: true
          }
        })
      }
    );

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1;

    currentAudio.play();
  } catch (err) {
    console.error("Voice error:", err);
  }
}

// ===============================
// 💬 SEND MESSAGE FLOW
// ===============================
async function sendMessage() {
  const input = document.getElementById("chat-message");
  const message = input.value.trim();

  if (!message) return;

  appendMessage("user", message);
  input.value = "";

  const reply = await getAIResponse(message);

  appendMessage("bot", reply);

  // slight delay = more human
  await new Promise(r => setTimeout(r, 300));

  speak(reply);
}

// ===============================
// 💬 UI MESSAGE HANDLER
// ===============================
function appendMessage(sender, text) {
  const chatBody = document.getElementById("chat-body");

  const messageDiv = document.createElement("div");
  messageDiv.className = sender === "user" ? "user-message" : "bot-message";

  messageDiv.innerText = text;

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ===============================
// ⌨️ ENTER TO SEND
// ===============================
document
  .getElementById("chat-message")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
