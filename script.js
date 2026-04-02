// ===============================
// ELEMENTS (SAFE LOAD)
// ===============================
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-message");
const sendBtn = document.getElementById("send-btn");

// Prevent crashes if elements missing
if (!chatBody || !chatInput || !sendBtn) {
  console.error("Chat elements missing in HTML");
}

// ===============================
// EVENT LISTENERS (FIXED)
// ===============================
sendBtn.onclick = sendMessage;

chatInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// ===============================
// ADD MESSAGE (WITH IMAGE SUPPORT)
// ===============================
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = sender === "user" ? "user-message" : "bot-message";

  // Image parsing
  if (text.includes("[IMAGE:")) {
    const splitText = text.split("[IMAGE:");
    const mainText = splitText[0];
    const imageQuery = splitText[1].replace("]", "").trim();

    const textNode = document.createElement("div");
    textNode.innerText = mainText;
    msg.appendChild(textNode);

    const img = document.createElement("img");
    img.src = `https://source.unsplash.com/400x300/?${encodeURIComponent(imageQuery)}`;
    img.style.width = "100%";
    img.style.marginTop = "10px";
    img.style.borderRadius = "10px";

    msg.appendChild(img);
  } else {
    msg.innerText = text;
  }

  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ===============================
// PERSONALITY (NATURAL, NOT FORCED)
// ===============================
function tone(text) {
  const extras = [
    "We’ll figure it out.",
    "You’re okay, I’ve got you.",
    "Let’s sort it out together.",
    "Nothing to stress about yet."
  ];
  return text + "\n\n" + extras[Math.floor(Math.random() * extras.length)];
}

// ===============================
// MEMORY (FOR FLOW)
// ===============================
let context = {
  lastTopic: null
};

// ===============================
// DENTAL KNOWLEDGE ENGINE
// ===============================
function dentalBrain(input) {
  input = input.toLowerCase();

  // Sensitivity
  if (input.includes("cold") || input.includes("hot")) {
    context.lastTopic = "sensitivity";
    return tone(
      "That sounds like sensitivity.\n\nIs it a quick sharp pain or does it linger?"
    );
  }

  // Bite pain
  if (input.includes("bite") || input.includes("chew")) {
    context.lastTopic = "bite";
    return tone(
      "Pain when biting usually means a crack or cavity.\n\nDoes it only hurt when chewing?"
    );
  }

  // Deep pain
  if (input.includes("throbbing") || input.includes("constant")) {
    context.lastTopic = "root";
    return tone(
      "That kind of pain can mean the nerve is affected.\n\nA root canal might be needed to remove the infection.\n\n[IMAGE: root canal procedure diagram]"
    );
  }

  // Cavity
  if (input.includes("hole") || input.includes("cavity")) {
    context.lastTopic = "filling";
    return tone(
      "That’s likely a cavity.\n\nA filling will clean it out and seal the tooth before it gets worse.\n\n[IMAGE: dental filling diagram]"
    );
  }

  // Gum issues
  if (input.includes("gum") || input.includes("bleeding")) {
    context.lastTopic = "gums";
    return tone(
      "That could be gum inflammation.\n\nDo your gums bleed when brushing?"
    );
  }

  return null;
}

// ===============================
// MAIN RESPONSE SYSTEM
// ===============================
function respond(input) {
  const lower = input.toLowerCase();

  // Greeting
  if (["hi", "hello", "hey"].includes(lower)) {
    return tone(
      "Hey.\n\nWhat’s going on — just checking in or something bothering you?"
    );
  }

  // Pain start
  if (lower.includes("tooth") || lower.includes("pain")) {
    return tone(
      "Tooth pain isn’t random.\n\nTell me what it feels like — sharp, dull, when eating, cold?"
    );
  }

  // Procedures
  if (lower.includes("filling")) {
    context.lastTopic = "filling";
    return tone(
      "A filling removes decay and seals your tooth.\n\nIt’s quick and stops the damage from spreading.\n\n[IMAGE: dental filling]"
    );
  }

  if (lower.includes("root canal")) {
    context.lastTopic = "root";
    return tone(
      "A root canal removes infection inside your tooth.\n\nIt actually stops pain and saves the tooth.\n\n[IMAGE: root canal]"
    );
  }

  if (lower.includes("crown")) {
    context.lastTopic = "crown";
    return tone(
      "A crown covers and protects a damaged tooth.\n\nThink of it like armor for your tooth.\n\n[IMAGE: dental crown]"
    );
  }

  if (lower.includes("braces") || lower.includes("invisalign")) {
    return tone(
      "Braces and Invisalign both straighten teeth.\n\nBraces stay on, Invisalign is removable.\n\n[IMAGE: braces invisalign]"
    );
  }

  // Context follow-up
  if (context.lastTopic === "sensitivity" && lower.includes("linger")) {
    return tone(
      "If it lingers, that’s deeper than normal sensitivity.\n\nYou might need a root canal."
    );
  }

  // Symptom detection
  const smart = dentalBrain(input);
  if (smart) return smart;

  // Fallback
  return tone(
    "Explain it a bit more so I don’t guess wrong.\n\nWhere exactly does it hurt?"
  );
}

// ===============================
// SEND MESSAGE
// ===============================
function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatInput.value = "";

  setTimeout(() => {
    const reply = respond(text);
    addMessage(reply, "bot");
  }, 400);
}

// ===============================
// START MESSAGE
// ===============================
window.onload = () => {
  setTimeout(() => {
    addMessage(
      "Hey.\n\nTalk to me — what’s going on?",
      "bot"
    );
  }, 600);
};
