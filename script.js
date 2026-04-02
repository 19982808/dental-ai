// ===============================
// ELEMENTS
// ===============================
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-message");
const sendBtn = document.getElementById("send-btn");

// ===============================
// SAFE INIT (prevents button bug)
// ===============================
if (sendBtn && chatInput) {
  sendBtn.addEventListener("click", sendMessage);

  chatInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// ===============================
// ADD MESSAGE TO CHAT
// ===============================
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = sender === "user" ? "user-message" : "bot-message";

  // IMAGE SUPPORT (stable)
  if (text.includes("[IMAGE:")) {
    const parts = text.split("[IMAGE:");
    msg.innerText = parts[0];

    const query = parts[1].replace("]", "").trim();

    const img = document.createElement("img");
    img.src = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;
    img.style.width = "100%";
    img.style.borderRadius = "12px";
    img.style.marginTop = "10px";

    msg.appendChild(img);
  } else {
    msg.innerText = text;
  }

  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ===============================
// PERSONALITY ENGINE
// ===============================
const personalityAddons = [
  "Don’t worry, I’ve got you 😌",
  "We’ll figure this out together",
  "You’re safe with me",
  "I promise I won’t make it complicated 😄",
  "You came to the right place 😉"
];

function addPersonality(text) {
  const extra =
    personalityAddons[Math.floor(Math.random() * personalityAddons.length)];
  return text + "\n\n" + extra;
}

// ===============================
// CONTEXT MEMORY (makes flow natural)
// ===============================
let lastTopic = null;

// ===============================
// SYMPTOM ANALYSIS ENGINE
// ===============================
function analyzeSymptoms(input) {
  input = input.toLowerCase();

  // Sensitivity
  if (input.includes("cold") || input.includes("hot") || input.includes("sensitive")) {
    lastTopic = "sensitivity";
    return addPersonality(
      "That sounds like tooth sensitivity 😬\n\nIs it a quick sharp pain or does it linger for a while?"
    );
  }

  // Biting pain
  if (input.includes("bite") || input.includes("chewing")) {
    lastTopic = "bite";
    return addPersonality(
      "Pain when biting? That could be a small crack or cavity 👀\n\nDoes it only hurt when you chew?"
    );
  }

  // Root canal indicators
  if (
    input.includes("throbbing") ||
    input.includes("constant") ||
    input.includes("linger")
  ) {
    lastTopic = "root_canal";
    return addPersonality(
      "Hmm… that kind of pain usually means the nerve is involved 😟\n\nYou might need a root canal to fully stop it.\n\n[IMAGE: root canal dental procedure]"
    );
  }

  // Cavity
  if (
    input.includes("hole") ||
    input.includes("cavity") ||
    input.includes("black")
  ) {
    lastTopic = "filling";
    return addPersonality(
      "That sounds like a cavity 🦷\n\nA simple filling would fix it before it gets worse.\n\n[IMAGE: dental filling procedure]"
    );
  }

  // Gum disease
  if (
    input.includes("gum") ||
    input.includes("bleeding") ||
    input.includes("swelling")
  ) {
    lastTopic = "gums";
    return addPersonality(
      "Your gums might be inflamed 😬\n\nThat could be early gum disease.\n\nDo they bleed when brushing?"
    );
  }

  return null;
}

// ===============================
// MAIN RESPONSE ENGINE
// ===============================
function getAIResponse(input) {
  const lower = input.toLowerCase();

  // Greetings (natural)
  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey"
  ) {
    return addPersonality(
      "Hey 😊\n\nTell me… are we just talking or is your smile trying to tell me something?"
    );
  }

  // General pain entry
  if (lower.includes("tooth") || lower.includes("pain") || lower.includes("ache")) {
    return addPersonality(
      "Ouch… tooth pain isn’t something to ignore 😅\n\nTell me exactly what you feel — sharp, dull, cold, when eating?"
    );
  }

  // PROCEDURES -------------------

  if (lower.includes("filling")) {
    lastTopic = "filling";
    return addPersonality(
      "A filling is used to repair a cavity 🪥\n\nThe dentist removes decay and seals your tooth.\n\nQuick, simple, and you’ll feel normal again fast.\n\n[IMAGE: dental filling diagram]"
    );
  }

  if (lower.includes("root canal")) {
    lastTopic = "root_canal";
    return addPersonality(
      "A root canal removes infection inside your tooth and saves it 😌\n\nIt actually RELIEVES pain — not causes it.\n\n[IMAGE: root canal diagram]"
    );
  }

  if (lower.includes("crown")) {
    lastTopic = "crown";
    return addPersonality(
      "A crown protects a weak or damaged tooth 👑\n\nThink of it like a shield that restores strength and shape.\n\n[IMAGE: dental crown tooth]"
    );
  }

  if (lower.includes("braces") || lower.includes("invisalign")) {
    lastTopic = "braces";
    return addPersonality(
      "Looking to straighten things out? 😏\n\nBraces are fixed, Invisalign is removable and subtle.\n\nBoth give you that confident smile.\n\n[IMAGE: braces invisalign comparison]"
    );
  }

  // CONTEXT FOLLOW-UP (smart flow)
  if (lastTopic === "sensitivity" && (lower.includes("yes") || lower.includes("linger"))) {
    return addPersonality(
      "If it lingers, that’s deeper than simple sensitivity 😟\n\nWe might be looking at nerve involvement → possibly a root canal."
    );
  }

  if (lastTopic === "filling" && lower.includes("pain")) {
    return addPersonality(
      "If the cavity is already painful, it may be getting deeper 👀\n\nBest to treat it early before it turns into a root canal."
    );
  }

  // 🧠 Symptom detection
  const diagnosis = analyzeSymptoms(input);
  if (diagnosis) return diagnosis;

  // FALLBACK (never dry)
  return addPersonality(
    "Hmm… I want to get this right 😄\n\nTell me exactly what you're feeling — where, when, and how it hurts."
  );
}

// ===============================
// SEND MESSAGE
// ===============================
function sendMessage() {
  const userText = chatInput.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  chatInput.value = "";

  setTimeout(() => {
    const reply = getAIResponse(userText);
    addMessage(reply, "bot");
  }, 500);
}

// ===============================
// AUTO GREETING
// ===============================
window.onload = () => {
  setTimeout(() => {
    addMessage(
      "Hey… 😊\n\nTalk to me — is something bothering your smile or are we just vibing today?",
      "bot"
    );
  }, 700);
};
