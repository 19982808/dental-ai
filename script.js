// ===============================
// ELEMENTS (MATCH HTML)
// ===============================
const chatBody = document.getElementById("chat-box");
const chatInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// ===============================
// EVENTS (FIXED)
// ===============================
sendBtn.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// ===============================
// ADD MESSAGE
// ===============================
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = sender === "user" ? "user-message" : "bot-message";

  if (text.includes("[IMAGE:")) {
    const parts = text.split("[IMAGE:");
    msg.innerText = parts[0];

    const query = parts[1].replace("]", "").trim();

    const img = document.createElement("img");
    img.src = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;
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
// PERSONALITY
// ===============================
function tone(text) {
  const extras = [
    "I’ve got you.",
    "We’ll figure it out.",
    "You’re okay.",
    "Let’s sort this."
  ];
  return text + "\n\n" + extras[Math.floor(Math.random() * extras.length)];
}

// ===============================
// MEMORY
// ===============================
let context = { lastTopic: null };

// ===============================
// DENTAL INTELLIGENCE
// ===============================
function analyze(input) {
  input = input.toLowerCase();

  if (input.includes("cold") || input.includes("hot")) {
    context.lastTopic = "sensitivity";
    return tone("Sounds like sensitivity.\n\nIs it quick pain or lingering?");
  }

  if (input.includes("bite") || input.includes("chew")) {
    context.lastTopic = "bite";
    return tone("Pain when biting could mean a crack or cavity.\n\nOnly when chewing?");
  }

  if (input.includes("throbbing") || input.includes("constant")) {
    context.lastTopic = "root";
    return tone(
      "That might involve the nerve.\n\nYou may need a root canal.\n\n[IMAGE: root canal procedure]"
    );
  }

  if (input.includes("cavity") || input.includes("hole")) {
    context.lastTopic = "filling";
    return tone(
      "That’s a cavity.\n\nA filling will fix it.\n\n[IMAGE: dental filling]"
    );
  }

  if (input.includes("gum") || input.includes("bleed")) {
    context.lastTopic = "gums";
    return tone("That could be gum inflammation.\n\nDo they bleed when brushing?");
  }

  return null;
}

// ===============================
// MAIN RESPONSE
// ===============================
function reply(input) {
  const lower = input.toLowerCase();

  if (["hi", "hello", "hey"].includes(lower)) {
    return tone("Hey.\n\nWhat’s going on?");
  }

  if (lower.includes("tooth") || lower.includes("pain")) {
    return tone("Tell me what it feels like — sharp, dull, cold?");
  }

  if (lower.includes("filling")) {
    return tone(
      "A filling removes decay and protects your tooth.\n\n[IMAGE: dental filling diagram]"
    );
  }

  if (lower.includes("root canal")) {
    return tone(
      "A root canal removes infection and saves your tooth.\n\n[IMAGE: root canal diagram]"
    );
  }

  if (lower.includes("braces") || lower.includes("invisalign")) {
    return tone(
      "Braces are fixed, Invisalign is removable.\n\n[IMAGE: braces invisalign]"
    );
  }

  const smart = analyze(input);
  if (smart) return smart;

  return tone("Tell me more so I understand properly.");
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
    addMessage(reply(text), "bot");
  }, 400);
}

// ===============================
// START
// ===============================
window.onload = () => {
  addMessage("Hey.\n\nWhat’s going on?", "bot");
};
