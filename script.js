// ================================================
// RYNAR DENTAL AI — FULL FRONTEND VERSION
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

// ── FRONTEND MEMORY ───────────────────────────────
let memory = {};
function remember(key, value) { memory[key] = value; }
function recall(key) { return memory[key] || null; }

// ── Booking Fields ───────────────────────────────
const FIELDS = ["name", "phone", "date", "time", "service"];
const PROMPTS = {
  name:    "Hey there! What's your full name?",
  phone:   "And your WhatsApp number? (with country code, e.g. +254…)",
  date:    "What date would you like to come in?",
  time:    "Morning or afternoon—or a specific time?",
  service: "What brings you in today? Checkup, cleaning, whitening, braces consult, extraction, or something else?"
};

// ── Dental Knowledge Base ─────────────────────────
const DENTAL_KB = {
  whitening: "Teeth whitening can brighten your smile safely! I can guide you through in-chair or take-home options.",
  braces: "Braces and Invisalign can straighten teeth efficiently. I can explain what fits your smile best.",
  implants: "Dental implants are a great long-term solution for missing teeth—painless with proper anaesthetic.",
  rootcanal: "Root canals sound scary, but with modern anaesthetic, it's pain-free. Always best to treat early!",
  extraction: "Extractions are quick and safe. I'll give tips for a smooth recovery too.",
  veneers: "Veneers can transform your smile aesthetically. We can discuss your ideal look.",
  gumcare: "Healthy gums are key! I can share daily care tips to prevent gingivitis and keep gums happy.",
  kids: "Children’s dental care is super important. I can share fun ways to make brushing easy for little ones.",
  emergency: "Dental emergencies? Always best to visit ASAP. I can guide you through first-aid measures too.",
  hygiene: "Brushing twice a day, flossing, and regular checkups keep your smile healthy and bright!"
};

// ── System personality cues ───────────────────────
const SYSTEM_PERSONALITY = {
  tone: "warm, personable, funny, subtly flirty if appropriate",
  style: "friendly, casual, reassuring, never robotic",
  maxLen: 3 // short sentences unless genuinely needed
};

// ── Voice — Web Speech API ───────────────────────
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

// ── Jazz — Web Audio API ───────────────────────
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
  o.type = type;
  o.frequency.value = freq(midi);
  o.detune.value = (Math.random() - 0.5) * 7;
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

// ── AI FRONTEND SIMULATION ───────────────────────
async function askAI(userMsg) {
  showTyping(true);

  // Memory injection for fluency
  const userName = recall("name");
  let reply = "";

  // Check for dental keywords
  const keyword = Object.keys(DENTAL_KB).find(k => userMsg.toLowerCase().includes(k));
  if(keyword) {
    reply = DENTAL_KB[keyword];
  } else {
    // Else, playful response generator
    const jokes = [
      "😏 You're making me smile just by chatting!",
      "I love how curious you are about your teeth 😄",
      "Tell me more, I promise I won't bite! 🦷",
      "You have a way of making dental talk fun 😎"
    ];
    reply = jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Insert name naturally
  if(userName) reply = `${userName}, ${reply}`;

  chatHistory.push({ role: "user", content: userMsg });
  chatHistory.push({ role: "assistant", content: reply });
  showTyping(false);
  return reply;
}

// ── SEND MESSAGE ───────────────────────────────
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text  = input.value.trim();
  if (!text) return;
  input.value = "";

  appendMessage("user", text);

  // Booking flow
  if(awaitingField) {
    if(awaitingField === "name") remember("name", text);
    await handleBookingField(text);
    return;
  }

  // Booking trigger
  if(/\b(book|appointment|schedule|come in|visit|slot|reserve)\b/i.test(text)) {
    awaitingField = "name";
    const reply = "I'd love to get you sorted — let me take a few quick details. " + PROMPTS.name;
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
  speak(reply);
}

// ── BOOKING FLOW ───────────────────────────────
async function handleBookingField(value) {
  patientDraft[awaitingField] = value;
  const idx = FIELDS.indexOf(awaitingField);

  if(idx < FIELDS.length - 1) {
    awaitingField = FIELDS[idx+1];
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

  const patientMsg = encodeURIComponent(
    `✅ *Rynar Dental — Booking Confirmed*\n\n` +
    `📋 Ref: ${id}\n👤 ${b.name}\n📅 ${b.date} at ${b.time}\n🦷 ${b.service}\n\n` +
    `We look forward to seeing your smile! To reschedule just reply here.\n— Rynar Dental`
  );
  const clinicMsg = encodeURIComponent(
    `🦷 *New Booking — Rynar Dental*\n\n` +
    `Ref: ${id}\nPatient: ${b.name}\nPhone: ${b.phone}\n` +
    `Date: ${b.date} at ${b.time}\nService: ${b.service}\nBooked: ${bkg.bookedAt}`
  );

  const waPatient = `https://wa.me/${b.phone.replace(/\D/g,"")}?text=${patientMsg}`;
  const waClinic  = `https://wa.me/${CLINIC_WA}?text=${clinicMsg}`;

  const reply = `All done, ${b.name}! ✅ You're booked for ${b.date} at ${b.time} — ${b.service}. Your reference is *${id}*. Tap below to get your confirmation on WhatsApp 👇`;
  appendMessage("ai", reply);
  speak(`All done ${b.name}, you're booked for ${b.date} at ${b.time}. See you soon!`);

  const box = document.getElementById("chat-box");
  const a1 = document.createElement("a");
  a1.href = waPatient; a1.target = "_blank"; a1.className = "wa-btn";
  a1.innerHTML = "📲 Send My Confirmation on WhatsApp";
  box.appendChild(a1);

  const a2 = document.createElement("a");
  a2.href = waClinic; a2.target = "_blank"; a2.className = "wa-btn clinic";
  a2.innerHTML = "🏥 Notify Clinic on WhatsApp";
  box.appendChild(a2);

  box.scrollTop = box.scrollHeight;
  patientDraft = {};
}

// ── HELPERS ───────────────────────────────
function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerHTML = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showTyping(show) {
  document.getElementById("typing-indicator").classList.toggle("hidden", !show);
  if(show) document.getElementById("chat-box").scrollTop = 9999;
}

// ── BOOT ───────────────────────────────
window.addEventListener("load", () => {
  loadVoices();
  renderBookings();
  setTimeout(() => {
    loadVoices(); // retry
    const greet = "Hello… I'm Rynar, your personal dental AI 🦷 Whether you have questions about your smile, want to explore treatments, or you're ready to book — I'm here. What can I help you with today?";
    appendMessage("ai", greet);
    setTimeout(() => speak(greet), 400);
  }, 700);
});
