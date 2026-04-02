// ================================================
// RYNAR DENTAL AI — script.js
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

// ── System prompt ─────────────────────────────────
const SYSTEM = `You are Rynar — the warm, knowledgeable AI assistant for Rynar Dental, a premium dental clinic.

PERSONALITY:
You're like a trusted friend who happens to know everything about dentistry.
Warm, calm, reassuring — never clinical or robotic. Dental anxiety is real and you ease it naturally.
Light, personable. Once you know the patient's name, use it naturally.
You keep conversations flowing — like a real person would.

HOW YOU TALK:
- Natural and conversational — like texting a knowledgeable friend
- 1-3 sentences for simple questions, more only when genuinely needed
- No bullet points in casual conversation
- Always acknowledge what they said before answering
- Ask one follow-up question to keep the conversation going when it fits
- Never say "As an AI" or "I'm just a chatbot" — you ARE Rynar
- Never use "Certainly!" "Absolutely!" "Of course!" — too robotic
- If they say hi, greet them warmly and ask how you can help their smile today

WHAT YOU KNOW:
Teeth whitening (in-chair and take-home), braces and Invisalign, dental implants,
root canals (always reassure — painless with anaesthetic!), extractions and wisdom teeth,
veneers and cosmetic dentistry, gum disease and prevention, children's dentistry,
dental emergencies (always recommend urgent visit), general oral hygiene tips.

BOOKING:
When someone wants to book say something like:
"I'd love to get you booked in — let me take a few quick details."
The system handles the rest.

RULES:
- Always warm, human, and reassuring
- Extra gentle if someone seems nervous about dental visits
- Gently nudge toward booking when relevant — never pushy
- Short responses feel more human than long ones`;

// ════════════════════════════════════════════════
// VOICE — Web Speech API, deep male
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
// JAZZ — Web Audio API generative smooth jazz
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
// AI CALL — Groq via /api/chat
// ════════════════════════════════════════════════
async function askAI(userMsg, imageBase64 = null) {
  showTyping(true);

  // Groq llama3 doesn't support vision — describe image in text if present
  const userContent = imageBase64
    ? "The patient has uploaded a photo of their smile/teeth. Please give warm, encouraging observational feedback and recommend a consultation."
    : userMsg;

  chatHistory.push({ role: "user", content: userContent });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:             "llama3-8b-8192",
        messages: [
          { role: "system", content: SYSTEM },
          ...chatHistory
        ],
        temperature:       0.78,
        max_tokens:        250,
        frequency_penalty: 0.5,
        presence_penalty:  0.3
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showTyping(false);
      const msg = data?.error?.message || res.status;
      console.error("API error:", msg);
      if (res.status === 401) return "⚠️ API key issue — check GROQ_API_KEY in your Vercel environment variables.";
      if (res.status === 429) return "Getting a lot of requests right now — give me a second and try again.";
      return "Something went wrong on my end. Try again in a moment.";
    }

    const reply = data.choices[0].message.content.trim();
    chatHistory.push({ role: "assistant", content: reply });
    showTyping(false);
    return reply;

  } catch (e) {
    showTyping(false);
    console.error("Fetch error:", e);
    return "I lost my connection for a second — try again?";
  }
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

  // Booking flow in progress
  if (awaitingField) {
    await handleBookingField(text);
    return;
  }

  // Booking trigger
  if (/\b(book|appointment|schedule|come in|visit|slot|reserve)\b/i.test(text)) {
    awaitingField = "name";
    const reply = "I'd love to get you sorted — let me take a few quick details. " + PROMPTS.name;
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  // Image trigger
  if (/\b(photo|picture|image|look at|my teeth|my smile|upload|show you)\b/i.test(text)) {
    const reply = "Of course — tap the 📷 button and upload your photo. I'll take a careful look 😊";
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
  speak(reply);
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

  const waPatient = `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${patientMsg}`;
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
  patientDraft  = {};
}

// ════════════════════════════════════════════════
// IMAGE UPLOAD
// ════════════════════════════════════════════════
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const b64  = ev.target.result;
    const box  = document.getElementById("chat-box");
    const wrap = document.createElement("div");
    wrap.className = "message user";
    const img = document.createElement("img");
    img.src = b64;
    img.style.cssText = "max-width:190px;border-radius:10px;margin-top:4px;display:block";
    wrap.appendChild(img);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;

    const reply = await askAI("Please analyse this smile photo.", b64);
    appendMessage("ai", reply);
    speak(reply);
  };
  reader.readAsDataURL(file);
}

// ════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════
function toggleAdmin() {
  const cv      = document.getElementById("chatView");
  const av      = document.getElementById("adminView");
  const showing = av.style.display === "block";
  cv.style.display = showing ? "flex"  : "none";
  av.style.display = showing ? "none"  : "block";
  if (!showing) renderBookings();
}

function renderBookings() {
  const tbody = document.getElementById("bookingBody");
  const empty = document.getElementById("emptyMsg");
  tbody.innerHTML = "";

  if (!bookings.length) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  bookings.forEach((b, i) => {
    const phone = b.phone.replace(/\D/g, "");
    const msg   = encodeURIComponent(`Hi ${b.name}, confirming your Rynar Dental appointment on ${b.date} at ${b.time}. See you soon! 😊`);
    const tr    = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size:11px;color:var(--muted)">${b.id}</td>
      <td><strong>${b.name}</strong><br><small>${b.service}</small><br><small>${b.phone}</small></td>
      <td>${b.date}<br><small>${b.time}</small></td>
      <td>
        <a href="https://wa.me/${phone}?text=${msg}" target="_blank" class="wa-icon" title="WhatsApp">📲</a>
        <button class="del-btn" onclick="deleteBooking(${i})" title="Delete">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function deleteBooking(i) {
  if (!confirm("Remove this booking?")) return;
  bookings.splice(i, 1);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();
}

// ════════════════════════════════════════════════
// VOICE INPUT
// ════════════════════════════════════════════════
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    appendMessage("ai", "Voice input works best in Chrome — give that a try 😊");
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      const r      = new SR();
      r.lang       = "en-US";
      const micBtn = document.getElementById("micBtn");
      const label  = micBtn ? micBtn.querySelector(".btn-label") : null;
      if (micBtn) micBtn.classList.add("listening");
      if (label)  label.textContent = "Listening…";
      r.start();
      r.onresult = e => {
        const transcript = e.results[0][0].transcript;
        document.getElementById("user-input").value = transcript;
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
        sendMessage();
      };
      r.onerror = e => {
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
        if (e.error === "not-allowed")
          appendMessage("ai", "Mic access was blocked — please allow microphone permission in your browser settings.");
      };
      r.onend = () => {
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
      };
    })
    .catch(() => appendMessage("ai", "I need microphone access — please allow it in your browser settings."));
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

function showTyping(show) {
  document.getElementById("typing-indicator").classList.toggle("hidden", !show);
  if (show) document.getElementById("chat-box").scrollTop = 9999;
}

// ════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════
window.addEventListener("load", () => {
  loadVoices();
  renderBookings();
  setTimeout(() => {
    loadVoices(); // retry — Chrome needs a moment
    const greet = "Hello… I'm Rynar, your personal dental AI 🦷 Whether you have questions about your smile, want to explore treatments, or you're ready to book — I'm here. What can I help you with today?";
    appendMessage("ai", greet);
    setTimeout(() => speak(greet), 400);
  }, 700);
});
