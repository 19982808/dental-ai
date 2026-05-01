// ================================================
// RYNAR DENTAL AI — script.js v4 (STABLE)
// ================================================

const CLINIC_WA = "254757902314";

// ── STATE ────────────────────────────────────────
let chatHistory   = [];
let bookings      = JSON.parse(localStorage.getItem("rynar_bookings") || "[]");
let gallery       = JSON.parse(localStorage.getItem("rynar_gallery")  || "[]");
let awaitingField = null;
let patientDraft  = {};
let voiceOn       = true;
let chosenVoice   = null;

// ── SAFE DOM GETTER ──────────────────────────────
const $ = (id) => document.getElementById(id);

// ── SYSTEM PROMPT ────────────────────────────────
const SYSTEM = `You are Rynar — a warm, human-like dental assistant.
Keep responses short (1–3 sentences). No bullet points.
Be friendly, calm, and natural. Avoid robotic phrases.`;

// ════════════════════════════════════════════════
// VIEW NAVIGATION (FIXED)
// ════════════════════════════════════════════════
function showView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = $("view-" + view);
  if (el) el.classList.add("active");
}

// ════════════════════════════════════════════════
// VOICE (SAFE)
// ════════════════════════════════════════════════
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  chosenVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!voiceOn || !text) return;

  const utter = new SpeechSynthesisUtterance(
    text.replace(/<[^>]*>/g, "").substring(0, 250)
  );

  if (chosenVoice) utter.voice = chosenVoice;
  utter.rate = 0.9;
  utter.pitch = 0.8;

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ════════════════════════════════════════════════
// CHAT API (HARDENED)
// ════════════════════════════════════════════════
async function askAI(message) {
  showTyping(true);

  chatHistory.push({ role: "user", content: message });
  chatHistory = chatHistory.slice(-15);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM },
          ...chatHistory
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.error?.message || "API error");

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) throw new Error("Empty response");

    chatHistory.push({ role: "assistant", content: reply });

    showTyping(false);
    return reply;

  } catch (err) {
    console.error(err);
    showTyping(false);
    return "⚠️ Connection issue — try again in a moment.";
  }
}

// ════════════════════════════════════════════════
// SEND MESSAGE (FIXED FLOW)
// ════════════════════════════════════════════════
async function sendMessage() {
  const input = $("user-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  appendMessage("user", text);

  // Booking flow
  if (awaitingField) {
    handleBooking(text);
    return;
  }

  // Detect booking intent
  if (/book|appointment|visit/i.test(text)) {
    awaitingField = "name";
    const msg = "Sure — what's your full name?";
    appendMessage("ai", msg);
    speak(msg);
    return;
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
  speak(reply);
}

// ════════════════════════════════════════════════
// BOOKING FLOW (FIXED)
// ════════════════════════════════════════════════
const fields = ["name", "phone", "date", "time", "service"];

function handleBooking(value) {
  patientDraft[awaitingField] = value;

  const idx = fields.indexOf(awaitingField);

  if (idx < fields.length - 1) {
    awaitingField = fields[idx + 1];

    const prompts = {
      phone: "Your phone number?",
      date: "Preferred date?",
      time: "What time?",
      service: "What treatment do you need?"
    };

    const msg = prompts[awaitingField];
    appendMessage("ai", msg);
    speak(msg);

  } else {
    finishBooking();
  }
}

function finishBooking() {
  const id = "RD" + Date.now().toString().slice(-5);

  const booking = {
    id,
    ...patientDraft,
    created: new Date().toLocaleString()
  };

  bookings.push(booking);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));

  const msg = `You're booked, ${patientDraft.name}! ✅ (${id})`;
  appendMessage("ai", msg);
  speak(msg);

  patientDraft = {};
  awaitingField = null;

  renderBookings();
}

// ════════════════════════════════════════════════
// SYMPTOMS (SAFE)
// ════════════════════════════════════════════════
function buildSymptomGrid() {
  const grid = $("symptomGrid");
  if (!grid) return;

  const symptoms = ["Toothache", "Bleeding gums", "Sensitivity"];

  grid.innerHTML = "";
  symptoms.forEach(s => {
    const div = document.createElement("div");
    div.className = "symptom-chip";
    div.textContent = s;
    div.onclick = () => div.classList.toggle("selected");
    grid.appendChild(div);
  });
}

function diagnose() {
  alert("Diagnosis coming soon.");
}

// ════════════════════════════════════════════════
// GALLERY (SAFE)
// ════════════════════════════════════════════════
function renderGallery() {
  const grid = $("galleryGrid");
  if (!grid) return;

  if (!gallery.length) {
    grid.innerHTML = "<p>No images yet</p>";
    return;
  }

  grid.innerHTML = "";
  gallery.forEach(img => {
    const el = document.createElement("img");
    el.src = img.src;
    grid.appendChild(el);
  });
}

// ════════════════════════════════════════════════
// BOOKINGS TABLE
// ════════════════════════════════════════════════
function renderBookings() {
  const tbody = $("bookingBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  bookings.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${b.date}</td>
      <td>${b.service}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ════════════════════════════════════════════════
// CHAT UI HELPERS (FIXED)
// ════════════════════════════════════════════════
function appendMessage(sender, text) {
  const box = $("chat-box");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerHTML = text;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showTyping(show) {
  let el = $("typing-indicator");

  // auto-create if missing
  if (!el && show) {
    el = document.createElement("div");
    el.id = "typing-indicator";
    el.className = "typing";
    el.innerText = "Typing...";
    $("chat-box")?.appendChild(el);
  }

  if (el) el.style.display = show ? "block" : "none";
}

// ════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════
window.addEventListener("load", () => {
  loadVoices();
  buildSymptomGrid();
  renderBookings();
  renderGallery();

  const chatBox = $("chat-box");

  if (chatBox && chatBox.children.length === 0) {
    const greet = "Hey 😊 What’s going on with your teeth today?";
    appendMessage("ai", greet);
    setTimeout(() => speak(greet), 300);
  }
});
