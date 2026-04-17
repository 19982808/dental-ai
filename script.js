// ================= STATE =================
let chatHistory = [];
let userMemory = {
  name: null,
  lastSymptoms: null
};

let mode = "elite"; // elite, soft, clinical, flirty

// ================= PERSONALITY =================
const SYSTEM = `
You are Rynar, an elite AI dental assistant.
You are highly intelligent, human-like, and reassuring.
Avoid generic answers. Always tailor advice to the user's situation.
`;

const PERSONALITY = `
You are charming, confident, and smooth.
You speak like a premium private dentist.
Never sound robotic.
`;

const modePrompts = {
  elite: "Confident, premium, smooth.",
  soft: "Gentle, calm, reassuring.",
  clinical: "Direct, precise, medical.",
  flirty: "Playful, charming, slightly flirty but respectful."
};

// ================= UI =================
function appendMessage(sender, text) {
  const chat = document.getElementById("chat");
  const msg = document.createElement("div");
  msg.className = sender;
  msg.innerText = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping(show) {
  const typing = document.getElementById("typing");
  if (typing) typing.style.display = show ? "block" : "none";
}

// ================= VOICE =================
let recognition;

function startVoice() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Voice not supported");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    document.querySelector("input").value = text;
    sendMessage();
  };

  recognition.start();
}

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speech.pitch = 1;
  speechSynthesis.speak(speech);
}

// ================= SEND MESSAGE =================
async function sendMessage() {
  const input = document.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";

  // Name detection
  if (!userMemory.name) {
    const match = text.match(/my name is (\w+)|i am (\w+)|i'm (\w+)/i);
    if (match) {
      userMemory.name = match[1] || match[2] || match[3];
    }
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
}

// ================= AI =================
async function askAI(userMsg, imageBase64 = null) {
  showTyping(true);

  const userContent = imageBase64
    ? "The patient uploaded an image. Analyse visible dental issues carefully."
    : userMsg;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content:
              SYSTEM +
              PERSONALITY +
              " Mode: " +
              modePrompts[mode] +
              (userMemory.name
                ? ` The patient's name is ${userMemory.name}.`
                : "")
          },
          ...chatHistory,
          { role: "user", content: userContent }
        ],
        temperature: 0.9,
        max_tokens: 400
      })
    });

    let data;

    try {
      data = await res.json();
    } catch {
      const text = await res.text();
      showTyping(false);
      return `❌ Error ${res.status}: ${text}`;
    }

    if (!res.ok) {
      showTyping(false);
      return "Hmm… I had a small hiccup just now. Try again — I'm right here 😊";
    }

    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "I couldn’t generate a response.";

    chatHistory.push({ role: "user", content: userMsg });
    chatHistory.push({ role: "assistant", content: reply });

    showTyping(false);
    speak(reply);
    return reply;
  } catch (err) {
    showTyping(false);
    return "Connection issue — check your internet and try again.";
  }
}

// ================= SYMPTOMS =================
async function analyseSymptoms(list) {
  userMemory.lastSymptoms = list;

  appendMessage(
    "ai",
    "Give me a second — I’m taking a careful look at that… 👀"
  );

  const reply = await askAI(
    `Patient reports: ${list}.

Think carefully and DO NOT give generic advice.

Provide:
1. Most likely cause
2. Why this condition fits
3. Urgency level (low, moderate, urgent)
4. Specific actions tailored to THIS case
5. What to avoid

Do not repeat patterns. Vary your responses.`
  );

  appendMessage("ai", reply);
}

// ================= PAYMENT =================
function selectPlan(plan) {
  appendMessage(
    "ai",
    `Nice choice — the *${plan.title}* plan is a great option. I’ll take care of you from here 😊`
  );
}

// ================= GUIDES =================
function bookFromGuide() {
  appendMessage(
    "ai",
    "Great choice — let’s get you booked in. I’ll guide you through it."
  );
}

// ================= MODE SWITCH =================
function setMode(newMode) {
  mode = newMode;
  appendMessage("ai", `Switched to ${newMode} mode.`);
}
