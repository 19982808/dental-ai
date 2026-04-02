// ================================================
// RYNAR DENTAL AI — script.js (Updated)
// ================================================

// ── Update this to your clinic's WhatsApp number ──
const CLINIC_WA = "254757902314";

// ── State ─────────────────────────────────────────
let chatHistory   = [];
let bookings      = JSON.parse(localStorage.getItem("rynar_bookings") || "[]");
let awaitingField = null;
let patientDraft  = {};
let voiceOn       = true;
let jazzOn        = false;
let audioCtx      = null;
let masterGain    = null;
let jazzTimer     = null;
let chordIdx      = 0;
let chosenVoice   = null;

const FIELDS = ["name", "phone", "date", "time", "service"];
const PROMPTS = {
  name:    "What's your full name?",
  phone:   "What's your WhatsApp number? (with country code, e.g. +254…)",
  date:    "What date would you like to come in?",
  time:    "Morning or afternoon — or a specific time?",
  service: "What are you coming in for? Checkup, cleaning, whitening, braces consult, extraction, or something else?"
};

// ── SYSTEM PROMPT / CONVERSATION FLOW ─────────────
const SYSTEM = `
You are Rynar — the warm, witty, and slightly flirty AI dental assistant.
You're like a trusted friend who knows everything about dentistry.
Respond naturally and conversationally — jokes, subtle flirting, or light humor are fine.
Always acknowledge what the patient said, especially if they are anxious or in pain.
Guide them gently to booking when needed.
Never sound robotic.
Be fluent in all dental matters: teeth whitening, braces, Invisalign, implants, root canals, extractions, veneers, cosmetic dentistry, gum disease, kids' dentistry, and emergencies.
Keep conversations flowing — no awkward dead ends.
`;

// ════════════════════════════════════════════════
// VOICE — Web Speech API
// ════════════════════════════════════════════════
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const preferred = [
    "Google UK English Male",
    "Microsoft George - English (United Kingdom)",
    "Microsoft David - English (United States)",
    "Daniel", "Alex", "Fred"
  ];

  for (const name of preferred) {
    const match = voices.find(v => v.name === name);
    if (match) { chosenVoice = match; return; }
  }

  chosenVoice =
    voices.find(v => v.lang.startsWith("en") && /male|david|george|daniel|alex|fred/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith("en")) ||
    voices[0];
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function speak(text) {
  if (!voiceOn || !text) return;
  speechSynthesis.cancel();
  const clean = text.replace(/<[^>]*>/g, "").replace(/[*_]/g, "");
  const utt   = new SpeechSynthesisUtterance(clean);
  if (chosenVoice) utt.voice = chosenVoice;
  utt.rate   = 0.85;
  utt.pitch  = 0.75;
  utt.volume = 1;
  speechSynthesis.speak(utt);
}

function toggleVoice() {
  voiceOn = !voiceOn;
  const btn = document.getElementById("voiceBtn");
  btn.classList.toggle("on", voiceOn);
  btn.textContent = voiceOn ? "🔊" : "🔇";
  if (!voiceOn) speechSynthesis.cancel();
}

// ════════════════════════════════════════════════
// JAZZ BACKGROUND
// ════════════════════════════════════════════════
function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

const CHORDS = [
  [62,65,69,74], [67,71,74,77], [65,69,72,76], [65,69,72,76],
  [60,63,67,70], [65,69,72,75], [58,62,65,69], [58,62,65,69]
];
const BASS = [50,55,53,53,48,53,46,46];

function playNote(midi, time, dur, type, vol) {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(masterGain);
  o.type            = type;
  o.frequency.value = freq(midi);
  o.detune.value    = (Math.random() - 0.5) * 7;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.07);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.start(time);
  o.stop(time + dur + 0.05);
}

function jazzBeat() {
  const now  = audioCtx.currentTime;
  const beat = 1.15;
  const ch   = CHORDS[chordIdx % CHORDS.length];

  ch.forEach((m, i) => playNote(m, now, beat * 1.7, "sine", 0.034 - i * 0.005));
  playNote(BASS[chordIdx % BASS.length] - 12, now, beat * 1.6, "triangle", 0.07);

  if (Math.random() > 0.42) {
    const pent = [0, 2, 4, 7, 9];
    const note = ch[0] + pent[Math.floor(Math.random() * pent.length)] + 12;
    playNote(note, now + Math.random() * beat * 0.5, 0.3 + Math.random() * 0.5, "sine", 0.022);
  }
  chordIdx++;
}

function startJazz() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;

  const delay = audioCtx.createDelay(2);
  const fb    = audioCtx.createGain();
  const wet   = audioCtx.createGain();
  delay.delayTime.value = 0.3;
  fb.gain.value  = 0.32;
  wet.gain.value = 0.38;

  masterGain.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(audioCtx.destination);
  masterGain.connect(audioCtx.destination);

  jazzBeat();
  jazzTimer = setInterval(jazzBeat, 1150);
}

function stopJazz() {
  clearInterval(jazzTimer);
  if (masterGain) {
    masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
    setTimeout(() => { try { masterGain.disconnect(); } catch (e) {} }, 1000);
  }
}

function toggleJazz() {
  jazzOn = !jazzOn;
  document.getElementById("jazzBtn").classList.toggle("on", jazzOn);
  jazzOn ? startJazz() : stopJazz();
}

// ════════════════════════════════════════════════
// FRONTEND-ONLY AI RESPONSE (simple rules + humor)
// ════════════════════════════════════════════════
function askAI(userMsg) {
  return new Promise(resolve => {
    let reply = "";

    const msg = userMsg.toLowerCase();

    // Greetings
    if (/\b(hi|hello|hey)\b/.test(msg)) {
      reply = "Hey there! 😁 How's that smile today? Any tooth troubles I should know about?";
    }
    // Tooth ache
    else if (/\b(tooth ache|pain|hurts|sore|sensitive)\b/.test(msg)) {
      reply = "Ouch! 😬 I'm sorry you're feeling that. Let's see what could help — careful brushing, maybe a checkup, or a little humor to distract you? 😏";
    }
    // Braces mention
    else if (/\b(braces|invisalign|aligners)\b/.test(msg)) {
      reply = "Ah, braces! 😁 They can be a bit tricky, but worth it for that perfect smile. Need some tips or just venting?";
    }
    // Whitening
    else if (/\b(whitening|bright|yellow teeth|stains)\b/.test(msg)) {
      reply = "A sparkling smile coming right up! ✨ We have options that are quick and gentle. Fancy a joke while we talk about whitening?";
    }
    // Booking trigger
    else if (/\b(book|appointment|schedule|visit|reserve|slot)\b/.test(msg)) {
      awaitingField = "name";
      appendMessage("ai", "I'd love to get you sorted — let me take a few quick details. " + PROMPTS.name);
      speak("Let's get your appointment booked. " + PROMPTS.name);
      resolve("");
      return;
    }
    // Default playful response
    else {
      const jokes = [
        "I’d tell you a dental joke, but I might lose my fillings 😏",
        "Your smile is already 10/10 — but let's make it 11/10 😁",
        "Keep brushing… but I’m here if you need professional backup 😎"
      ];
      reply = jokes[Math.floor(Math.random() * jokes.length)];
    }

    chatHistory.push({ role: "assistant", content: reply });
    appendMessage("ai", reply);
    speak(reply);
    resolve(reply);
  });
}

// ════════════════════════════════════════════════
// SEND MESSAGE
// ════════════════════════════════════════════════
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text  = input.value.trim();
  if (!text) return;
  input.value = "";

  appendMessage("user", text);

  // Booking flow
  if (awaitingField) {
    await handleBookingField(text);
    return;
  }

  await askAI(text);
}

// ════════════════════════════════════════════════
// BOOKING FLOW
// ════════════════════════════════════════════════
async function handleBookingField(value) {
  patientDraft[awaitingField] = value;
  const idx = FIELDS.indexOf(awaitingField);

  if (idx < FIELDS.length - 1) {
    awaitingField = FIELDS[idx + 1];
    appendMessage("ai", PROMPTS[awaitingField]);
    speak(PROMPTS[awaitingField]);
  } else {
    awaitingField = null;
    await confirmBooking();
  }
}

async function confirmBooking() {
  const b   = patientDraft;
  const id  = "RD" + Date.now().toString().slice(-5);
  const bkg = { id, ...b, bookedAt: new Date().toLocaleString() };

  bookings.push(bkg);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();

  const reply = `All done, ${b.name}! ✅ You're booked for ${b.date} at ${b.time} — ${b.service}. Your reference is *${id}*. Tap below to get your confirmation on WhatsApp 👇`;
  appendMessage("ai", reply);
  speak(`All done ${b.name}, you're booked for ${b.date} at ${b.time}. See you soon!`);
  patientDraft  = {};
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════
function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerHTML = text
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ════════════════════════════════════════════════
// BOOT & BUTTON HOOKS
// ════════════════════════════════════════════════
window.addEventListener("load", () => {
  loadVoices();

  const greet = "Hello… I'm Rynar, your personal dental AI 🦷 How can I help your smile today?";
  appendMessage("ai", greet);
  setTimeout(() => speak(greet), 400);

  // Send button
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.addEventListener("click", sendMessage);
  document.getElementById("user-input").addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });
});
