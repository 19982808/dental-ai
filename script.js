// ================================================
// RYNAR DENTAL AI — script.js v3 (fixed)
// ================================================

const CLINIC_WA = "254757902314";

// ── State ────────────────────────────────────────
let chatHistory   = [];
let bookings      = JSON.parse(localStorage.getItem("rynar_bookings") || "[]");
let gallery       = JSON.parse(localStorage.getItem("rynar_gallery")  || "[]");
let awaitingField = null;
let patientDraft  = {};
let voiceOn       = true;
let jazzOn        = false;
let audioCtx      = null;
let masterGain    = null;
let jazzTimer     = null;
let chordIdx      = 0;
let chosenVoice   = null;
let selectedPlan  = null;
let currentView   = "chat";

const FIELDS = ["name","phone","date","time","service"];
const PROMPTS = {
  name:    "What's your full name?",
  phone:   "What's your WhatsApp number? (e.g. +254…)",
  date:    "What date works for you?",
  time:    "Morning or afternoon — or a specific time?",
  service: "What are you coming in for? Checkup, cleaning, whitening, braces, extraction, or something else?"
};

// ── System prompt ─────────────────────────────────
const SYSTEM = `You are Rynar — the friendly dental assistant at Rynar Dental clinic.

WHO YOU ARE:
A warm, knowledgeable dental expert who talks like a real person — not a robot.
You ease dental anxiety. You remember what was said earlier in the conversation and refer back to it naturally.
Once you know the patient's name, use it occasionally.

STRICT CONVERSATION RULES — follow these exactly:
1. If someone says "hi", "hello", "hey" or any greeting — respond with a SHORT warm greeting back and ONE question about their smile. Example: "Hey there! 😊 What's going on with your teeth today?" Do NOT introduce yourself again if you already have.
2. NEVER start two consecutive responses the same way. Vary your openings.
3. NEVER repeat your introduction. You already said who you are — don't say it again.
4. Answer questions DIRECTLY and CONCISELY. If someone asks "what is a root canal?" — explain it in 2-3 sentences. Don't ask them a question back unless it genuinely helps.
5. Keep responses SHORT — 1 to 3 sentences max for normal questions. Only go longer if a detailed explanation is genuinely needed.
6. NEVER use bullet points or numbered lists in conversation.
7. Always read what the user said carefully and respond TO THAT SPECIFIC THING.
8. If they seem anxious or nervous about dental visits — be extra warm and reassuring.
9. Gently suggest booking an appointment when it naturally fits — never pushy.
10. NEVER say "As an AI", "I am just a chatbot", "Certainly!", "Absolutely!", "Of course!" or "Great question!"

DENTAL KNOWLEDGE:
You know everything about teeth — all 32 tooth numbers (FDI and Universal systems), enamel, dentine, pulp, root canals, fillings, implants, crowns, veneers, whitening, braces, Invisalign, extractions, gum disease, gingivitis, periodontitis, dental abscesses, TMJ, bruxism, paediatric dentistry, orthodontics, X-ray types, pain management (ibuprofen 400mg, clove oil, salt rinse, cold compress), and dental emergencies.

FOR SYMPTOMS:
Assess what they describe, name the likely condition, give urgency level, and suggest immediate relief if needed. Always recommend a proper consultation.

EMERGENCY SIGNS — flag these as urgent:
Severe swelling, abscess, knocked-out tooth (must be re-implanted within 30 minutes), uncontrolled bleeding, or signs of infection spreading.`;

// ── Symptoms data ─────────────────────────────────
const SYMPTOMS = [
  { icon:"🦷", label:"Toothache",          id:"toothache" },
  { icon:"🩸", label:"Bleeding gums",      id:"bleeding_gums" },
  { icon:"🥶", label:"Sensitivity",        id:"sensitivity" },
  { icon:"💨", label:"Bad breath",         id:"bad_breath" },
  { icon:"😬", label:"Swollen gum",        id:"swelling" },
  { icon:"😮", label:"Loose tooth",        id:"loose_tooth" },
  { icon:"🦴", label:"Jaw pain",           id:"jaw_pain" },
  { icon:"🔴", label:"Mouth sore",         id:"mouth_sore" },
  { icon:"⬛", label:"Discolouration",     id:"discolouration" },
  { icon:"💥", label:"Broken tooth",       id:"broken_tooth" },
  { icon:"😴", label:"Teeth grinding",     id:"grinding" },
  { icon:"😷", label:"Dry mouth",          id:"dry_mouth" },
];

// ── Treatment guides data ─────────────────────────
const GUIDES = [
  {
    id:"root_canal", emoji:"🦷", title:"Root Canal", tagline:"Painless & tooth-saving",
    desc:"A root canal removes infected pulp from inside the tooth, saving it from extraction. Modern techniques make it no more uncomfortable than a filling.",
    steps:["Local anaesthetic is applied — you feel nothing during the procedure","The dentist accesses the pulp chamber and removes infected tissue","The canals are cleaned, shaped and disinfected thoroughly","Canals are filled with gutta-percha and sealed","A crown is usually placed to protect the tooth long-term"],
    pain:"Take ibuprofen 400mg with food 1 hour before your appointment. Clove oil on the gum can help before you come in.",
    urgency:"moderate", duration:"60-90 min", sessions:"1-2"
  },
  {
    id:"whitening", emoji:"✨", title:"Teeth Whitening", tagline:"Brighter smile, fast",
    desc:"Professional whitening uses peroxide gel activated by light to break down stains. Results are dramatically better than home kits.",
    steps:["Shade assessment and photos taken","Gum barrier applied to protect soft tissue","Whitening gel applied to teeth in layers","LED light activates the gel for maximum effect","Final shade comparison — typically 4-8 shades lighter"],
    pain:"Some temporary sensitivity is normal. Avoid hot/cold drinks for 24 hours after treatment.",
    urgency:"routine", duration:"60 min", sessions:"1"
  },
  {
    id:"implant", emoji:"🔩", title:"Dental Implant", tagline:"Permanent tooth replacement",
    desc:"An implant is a titanium screw placed in the jawbone to replace a missing tooth root. After healing, a crown is attached — looks and feels like a real tooth.",
    steps:["CT scan to plan implant position precisely","Implant placed under local anaesthetic","Healing period of 3-6 months (osseointegration)","Abutment attached once bone has integrated","Custom crown fitted — your permanent new tooth"],
    pain:"Mild soreness for 3-5 days post-surgery. Ibuprofen and cold compress manage this well.",
    urgency:"routine", duration:"45 min (placement)", sessions:"3-4 over 6 months"
  },
  {
    id:"extraction", emoji:"🪥", title:"Tooth Extraction", tagline:"Quick and comfortable",
    desc:"Extractions are performed under local anaesthetic — you feel pressure but no pain. Wisdom teeth may require a surgical approach.",
    steps:["X-ray taken to plan the extraction","Local anaesthetic injected — area goes numb in minutes","Tooth loosened using an elevator instrument","Tooth removed with forceps","Gauze placed to control bleeding — bite down for 30 min"],
    pain:"Ibuprofen 400mg every 6-8 hours for 2 days. No smoking, straws, or hard food for 24 hours.",
    urgency:"varies", duration:"20-45 min", sessions:"1"
  },
  {
    id:"braces", emoji:"😬", title:"Braces / Invisalign", tagline:"Straighter teeth, more confidence",
    desc:"Modern orthodontics offers metal braces, ceramic braces, and clear aligner systems like Invisalign — all effective for different needs.",
    steps:["Comprehensive examination and X-rays","Impressions or digital scan for treatment planning","Braces bonded or aligners fitted","Regular 4-6 weekly adjustment appointments","Retainer fitted at end of treatment to maintain results"],
    pain:"Mild achiness for 3-5 days after each adjustment. Soft foods and over-the-counter pain relief help.",
    urgency:"routine", duration:"18-36 months total", sessions:"Monthly"
  },
  {
    id:"cleaning", emoji:"🪣", title:"Scale & Polish", tagline:"Fresh start for your gums",
    desc:"Professional cleaning removes tartar and plaque that brushing can't reach. Essential for preventing gum disease.",
    steps:["Periodontal assessment — gum depths measured","Ultrasonic scaler removes tartar above and below gumline","Hand instruments clean between teeth","Polish removes surface stains","Fluoride treatment applied for protection"],
    pain:"No pain expected. Slight sensitivity possible if gums are inflamed — this resolves within 24 hours.",
    urgency:"routine", duration:"45-60 min", sessions:"1 (every 6 months)"
  },
  {
    id:"veneer", emoji:"💎", title:"Veneers", tagline:"Instant smile transformation",
    desc:"Porcelain veneers are ultra-thin shells bonded to the front of teeth — perfect for chips, stains, or gaps.",
    steps:["Consultation and smile design planning","Minimal enamel reduction (0.5mm) under anaesthetic","Impressions sent to dental laboratory","Temporaries placed while veneers are made","Permanent veneers bonded and polished"],
    pain:"Minimal discomfort. Some sensitivity for a few days after enamel preparation.",
    urgency:"routine", duration:"90 min (fit)", sessions:"2-3"
  },
  {
    id:"filling", emoji:"🔲", title:"Tooth Filling", tagline:"Stop decay in its tracks",
    desc:"Composite (tooth-coloured) fillings restore cavities. Modern materials are durable and completely natural-looking.",
    steps:["Local anaesthetic applied","Decay removed with drill or laser","Tooth shaped for optimal filling retention","Composite resin applied in layers","Filling light-cured, shaped and polished"],
    pain:"No pain during procedure. Mild sensitivity for 1-2 days is normal.",
    urgency:"moderate", duration:"30-45 min", sessions:"1"
  },
];

// ── Payment plans ─────────────────────────────────
const PLANS = [
  {
    id:"ai_consult", title:"AI Consultation", price:"Free", currency:"",
    desc:"Chat with Rynar AI anytime about symptoms, treatments, and oral health.",
    features:["Unlimited AI chat","Symptom checker","Treatment guides","Appointment booking"],
    featured:false
  },
  {
    id:"video_consult", title:"Video Consultation", price:"1,500", currency:"KSh",
    desc:"30-minute video call with a qualified dentist — from anywhere.",
    features:["30-min video call with dentist","Treatment recommendation","Written care plan","Priority booking"],
    featured:true
  },
  {
    id:"clinic_visit", title:"Clinic Examination", price:"2,500", currency:"KSh",
    desc:"Full in-clinic examination with X-rays and personalised treatment plan.",
    features:["Full oral examination","Digital X-rays included","Same-day treatment if needed","30-day follow-up included"],
    featured:false
  },
  {
    id:"premium", title:"Premium Care Package", price:"12,000", currency:"KSh",
    desc:"3-month comprehensive care: cleaning, whitening, and unlimited check-ins.",
    features:["Scale & polish","Teeth whitening","3 follow-up appointments","Priority emergency slots","Unlimited AI chat"],
    featured:false
  },
];

// ════════════════════════════════════════════════
// VIEW NAVIGATION
// ════════════════════════════════════════════════
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  const v = document.getElementById("view-" + name);
  if (v) v.classList.add("active");
  const tabs = { chat:"0", symptom:"1", guides:"2", payment:"3" };
  if (tabs[name] !== undefined) {
    document.querySelectorAll(".nav-tab")[tabs[name]]?.classList.add("active");
  }
  currentView = name;
}

// ════════════════════════════════════════════════
// VOICE — Web Speech API deep male
// ════════════════════════════════════════════════
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  const preferred = [
    "Google UK English Male","Microsoft George - English (United Kingdom)",
    "Microsoft David - English (United States)","Daniel","Alex","Fred"
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) { chosenVoice = v; return; }
  }
  chosenVoice = voices.find(v => v.lang.startsWith("en") && /male|david|george|daniel|alex|fred/i.test(v.name))
    || voices.find(v => v.lang.startsWith("en")) || voices[0];
}
if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  if (!voiceOn || !text) return;
  speechSynthesis.cancel();
  const clean = text.replace(/<[^>]*>/g,"").replace(/[*_]/g,"").substring(0, 300);
  const utt   = new SpeechSynthesisUtterance(clean);
  if (chosenVoice) utt.voice = chosenVoice;
  utt.rate = 0.88; utt.pitch = 0.75; utt.volume = 1;
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
// JAZZ — Web Audio API
// ════════════════════════════════════════════════
function freq(midi) { return 440 * Math.pow(2,(midi-69)/12); }
const CHORDS = [[62,65,69,74],[67,71,74,77],[65,69,72,76],[65,69,72,76],[60,63,67,70],[65,69,72,75],[58,62,65,69],[58,62,65,69]];
const BASS   = [50,55,53,53,48,53,46,46];

function playNote(midi, time, dur, type, vol) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = type; o.frequency.value = freq(midi); o.detune.value = (Math.random()-.5)*7;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time+0.07);
  g.gain.exponentialRampToValueAtTime(0.0001, time+dur);
  o.start(time); o.stop(time+dur+.05);
}

function jazzBeat() {
  const now = audioCtx.currentTime, beat = 1.15, ch = CHORDS[chordIdx % CHORDS.length];
  ch.forEach((m,i) => playNote(m, now, beat*1.7, "sine", 0.034-i*0.005));
  playNote(BASS[chordIdx % BASS.length]-12, now, beat*1.6, "triangle", 0.07);
  if (Math.random() > 0.42) {
    const pent = [0,2,4,7,9], note = ch[0] + pent[Math.floor(Math.random()*pent.length)] + 12;
    playNote(note, now + Math.random()*beat*.5, 0.3+Math.random()*.5, "sine", 0.022);
  }
  chordIdx++;
}

function startJazz() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  masterGain = audioCtx.createGain(); masterGain.gain.value = 0.5;
  const delay = audioCtx.createDelay(2), fb = audioCtx.createGain(), wet = audioCtx.createGain();
  delay.delayTime.value = 0.3; fb.gain.value = 0.32; wet.gain.value = 0.38;
  masterGain.connect(delay); delay.connect(fb); fb.connect(delay);
  delay.connect(wet); wet.connect(audioCtx.destination); masterGain.connect(audioCtx.destination);
  jazzBeat(); jazzTimer = setInterval(jazzBeat, 1150);
}

function stopJazz() {
  clearInterval(jazzTimer);
  if (masterGain) {
    masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.8);
    setTimeout(() => { try { masterGain.disconnect(); } catch(e) {} }, 1000);
  }
}

function toggleJazz() {
  const btn = document.getElementById("jazzBtn");
  jazzOn = !jazzOn; btn.classList.toggle("on", jazzOn);
  jazzOn ? startJazz() : stopJazz();
}

// ════════════════════════════════════════════════
// CHAT UI HELPERS
// ════════════════════════════════════════════════
function appendMessage(role, text) {
  const box = document.getElementById("chat-box");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showTyping(show) {
  const t = document.getElementById("typing");
  if (t) t.style.display = show ? "flex" : "none";
}

// ════════════════════════════════════════════════
// AI CALL  ← FIXED
// ════════════════════════════════════════════════
async function askAI(userMsg, imageBase64 = null) {
  showTyping(true);
  const userContent = imageBase64
    ? "The patient has uploaded a photo of their smile/teeth. Give warm observational feedback, note anything worth a professional look, and recommend a consultation."
    : userMsg;
  chatHistory.push({ role: "user", content: userContent });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:       "llama3-8b-8192",
        messages:    [{ role: "system", content: SYSTEM }, ...chatHistory],
        temperature: 0.75,
        max_tokens:  300,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json(); // read body once here
      showTyping(false);
      return `Error ${res.status}: ${JSON.stringify(errorData)}`;
    }

    const data  = await res.json(); // only reached when response is OK
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

  if (awaitingField) { await handleBookingField(text); return; }

  if (/\b(book|appointment|schedule|come in|visit|slot|reserve)\b/i.test(text)) {
    awaitingField = "name";
    const reply = "I'd love to get you sorted — let me take a few quick details. " + PROMPTS.name;
    appendMessage("ai", reply); speak(reply); return;
  }

  if (/\b(photo|picture|image|look at|my teeth|my smile|upload|show you)\b/i.test(text)) {
    const reply = "Of course — tap the 📷 button and upload your photo. I'll take a careful look 😊";
    appendMessage("ai", reply); speak(reply); return;
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
  speak(reply);
}

// ════════════════════════════════════════════════
// KEYBOARD — Enter to send
// ════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }
});

// ════════════════════════════════════════════════
// VOICE INPUT — Speech Recognition
// ════════════════════════════════════════════════
function startVoiceInput() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Voice input isn't supported in this browser. Try Chrome."); return; }
  const r = new SR();
  r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const input = document.getElementById("user-input");
    if (input) { input.value = transcript; sendMessage(); }
  };
  r.onerror = (e) => console.error("Speech error:", e.error);
  r.start();
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
  const b  = patientDraft;
  const id = "RD" + Date.now().toString().slice(-5);
  const booking = { id, ...b, bookedAt: new Date().toLocaleString() };
  bookings.push(booking);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();

  const patientMsg = encodeURIComponent(`✅ *Rynar Dental — Booking Confirmed*\n\n📋 Ref: ${id}\n👤 ${b.name}\n📅 ${b.date} at ${b.time}\n🦷 ${b.service}\n\nWe look forward to seeing your smile!\n— Rynar Dental`);
  const clinicMsg  = encodeURIComponent(`🦷 *New Booking*\n\nRef: ${id}\nPatient: ${b.name}\nPhone: ${b.phone}\nDate: ${b.date} at ${b.time}\nService: ${b.service}\nBooked: ${booking.bookedAt}`);
  const waPatient  = `https://wa.me/${b.phone.replace(/\D/g,"")}?text=${patientMsg}`;
  const waClinic   = `https://wa.me/${CLINIC_WA}?text=${clinicMsg}`;

  const reply = `All done, ${b.name}! ✅ Booked for ${b.date} at ${b.time} — ${b.service}. Reference: *${id}*. Tap below to get your WhatsApp confirmation 👇`;
  appendMessage("ai", reply);
  speak(`All done ${b.name}! Booked for ${b.date} at ${b.time}. See you soon!`);

  const box = document.getElementById("chat-box");
  const a1  = document.createElement("a");
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

function bookFromGuide() {
  showView("chat");
  awaitingField = "name";
  const reply = "Let's get you booked in. " + PROMPTS.name;
  appendMessage("ai", reply); speak(reply);
}

// ════════════════════════════════════════════════
// SYMPTOM CHECKER
// ════════════════════════════════════════════════
function buildSymptomGrid() {
  const grid = document.getElementById("symptom-grid");
  if (!grid) return;
  grid.innerHTML = SYMPTOMS.map(s => `
    <div class="symptom-card" id="sym-${s.id}" onclick="toggleSymptom('${s.id}')">
      <span class="sym-icon">${s.icon}</span>
      <span class="sym-label">${s.label}</span>
    </div>
  `).join("");
}

function toggleSymptom(id) {
  const card = document.getElementById("sym-" + id);
  if (card) card.classList.toggle("selected");
}

async function analyseSymptoms() {
  const selected = SYMPTOMS.filter(s =>
    document.getElementById("sym-" + s.id)?.classList.contains("selected")
  );
  if (!selected.length) {
    alert("Please select at least one symptom first.");
    return;
  }
  const list = selected.map(s => s.label).join(", ");
  showView("chat");
  const msg = `I'm experiencing: ${list}`;
  appendMessage("user", msg);
  const reply = await askAI(msg);
  appendMessage("ai", reply);
  speak(reply);
  // Deselect all after analysis
  SYMPTOMS.forEach(s => document.getElementById("sym-" + s.id)?.classList.remove("selected"));
}

// ════════════════════════════════════════════════
// TREATMENT GUIDES
// ════════════════════════════════════════════════
function renderGuides() {
  const list = document.getElementById("guides-list");
  if (!list) return;
  list.innerHTML = GUIDES.map(g => `
    <div class="guide-card" onclick="showGuide('${g.id}')">
      <span class="guide-emoji">${g.emoji}</span>
      <div class="guide-info">
        <strong>${g.title}</strong>
        <p>${g.tagline}</p>
      </div>
      <span class="guide-arrow">›</span>
    </div>
  `).join("");
}

function showGuide(id) {
  const g = GUIDES.find(x => x.id === id);
  if (!g) return;
  const detail = document.getElementById("guide-detail");
  const list   = document.getElementById("guides-list");
  if (!detail || !list) return;

  const urgencyColour = { routine:"#2ecc71", moderate:"#f39c12", urgent:"#e74c3c", varies:"#3498db" };
  const colour = urgencyColour[g.urgency] || "#888";

  detail.innerHTML = `
    <div class="guide-header">
      <span class="guide-big-emoji">${g.emoji}</span>
      <div>
        <h2>${g.title}</h2>
        <span class="guide-tagline">${g.tagline}</span>
      </div>
    </div>
    <p class="guide-desc">${g.desc}</p>
    <div class="guide-meta">
      <span>⏱ ${g.duration}</span>
      <span>📅 ${g.sessions}</span>
      <span style="color:${colour}">● ${g.urgency.charAt(0).toUpperCase() + g.urgency.slice(1)}</span>
    </div>
    <h3>What happens step by step:</h3>
    <ol class="guide-steps">${g.steps.map(s => `<li>${s}</li>`).join("")}</ol>
    <div class="guide-pain-box">
      <strong>💊 Pain management:</strong>
      <p>${g.pain}</p>
    </div>
  `;
  list.style.display   = "none";
  detail.style.display = "block";
  const backBtn = document.getElementById("guide-back");
  if (backBtn) backBtn.style.display = "inline-flex";
}

function backToGuides() {
  const list   = document.getElementById("guides-list");
  const detail = document.getElementById("guide-detail");
  const backBtn = document.getElementById("guide-back");
  if (list)   list.style.display   = "grid";
  if (detail) detail.style.display = "none";
  if (backBtn) backBtn.style.display = "none";
}

// ════════════════════════════════════════════════
// PAYMENT PLANS
// ════════════════════════════════════════════════
function renderPaymentPlans() {
  const container = document.getElementById("plans-container");
  if (!container) return;
  container.innerHTML = PLANS.map(p => `
    <div class="plan-card ${p.featured ? "featured" : ""} ${selectedPlan === p.id ? "chosen" : ""}"
         onclick="selectPlan('${p.id}')">
      ${p.featured ? '<div class="plan-badge">Most Popular</div>' : ""}
      <h3>${p.title}</h3>
      <div class="plan-price">
        ${p.currency ? `<span class="plan-currency">${p.currency}</span>` : ""}
        <span class="plan-amount">${p.price}</span>
      </div>
      <p class="plan-desc">${p.desc}</p>
      <ul class="plan-features">
        ${p.features.map(f => `<li>✓ ${f}</li>`).join("")}
      </ul>
      <button class="plan-btn ${selectedPlan === p.id ? "selected" : ""}">
        ${selectedPlan === p.id ? "Selected ✓" : "Select Plan"}
      </button>
    </div>
  `).join("");
}

function selectPlan(id) {
  selectedPlan = id;
  renderPaymentPlans();
  const plan = PLANS.find(p => p.id === id);
  if (!plan) return;
  const msg = encodeURIComponent(
    `Hi Rynar Dental 👋\n\nI'd like to book the *${plan.title}*${plan.currency ? ` (${plan.currency} ${plan.price})` : ""}.\n\nPlease send me the payment details. Thank you!`
  );
  const waBtn = document.getElementById("wa-pay-btn");
  if (waBtn) waBtn.href = `https://wa.me/${CLINIC_WA}?text=${msg}`;
}

function completeBooking() {
  if (!selectedPlan) { alert("Please select a plan first."); return; }
  const waBtn = document.getElementById("wa-pay-btn");
  if (waBtn) window.open(waBtn.href, "_blank");
}

// ════════════════════════════════════════════════
// SMILE GALLERY
// ════════════════════════════════════════════════
function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataURL = e.target.result;
    const base64  = dataURL.split(",")[1];
    gallery.push({ src: dataURL, date: new Date().toLocaleString() });
    localStorage.setItem("rynar_gallery", JSON.stringify(gallery));
    renderGallery();
    showView("chat");
    appendMessage("user", "📷 [Smile photo uploaded]");
    const reply = await askAI(null, base64);
    appendMessage("ai", reply);
    speak(reply);
  };
  reader.readAsDataURL(file);
  input.value = ""; // reset so same file can be re-uploaded
}

function renderGallery() {
  const container = document.getElementById("gallery-container");
  if (!container) return;
  if (!gallery.length) {
    container.innerHTML = '<p class="gallery-empty">No photos yet — upload a smile photo to get started.</p>';
    return;
  }
  container.innerHTML = gallery.map((img, i) => `
    <div class="gallery-item">
      <img src="${img.src}" alt="Smile photo ${i + 1}" loading="lazy">
      <div class="gallery-meta">${img.date}</div>
      <button class="gallery-delete" onclick="deletePhoto(${i})">🗑️ Delete</button>
    </div>
  `).join("");
}

function deletePhoto(i) {
  if (!confirm("Delete this photo?")) return;
  gallery.splice(i, 1);
  localStorage.setItem("rynar_gallery", JSON.stringify(gallery));
  renderGallery();
}

// ════════════════════════════════════════════════
// BOOKINGS DASHBOARD
// ════════════════════════════════════════════════
function renderBookings() {
  const tbody = document.getElementById("bookings-tbody");
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No bookings yet.</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map((b, i) => `
    <tr>
      <td><strong>${b.id}</strong></td>
      <td>${b.name}<br><small>${b.phone}</small></td>
      <td>${b.date} @ ${b.time}<br><small>${b.service}</small></td>
      <td>
        <button class="del-btn" onclick="deleteBooking(${i})" title="Cancel booking">🗑️</button>
      </td>
    </tr>
  `).join("");
}

function deleteBooking(i) {
  if (!confirm("Cancel this booking?")) return;
  bookings.splice(i, 1);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();
}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  loadVoices();
  buildSymptomGrid();
  renderGuides();
  renderPaymentPlans();
  renderGallery();
  renderBookings();
  showView("chat");

  // Welcome message after short delay
  setTimeout(() => {
    const welcome = "Hey there! 😊 I'm Rynar, your dental assistant. What's going on with your teeth today?";
    appendMessage("ai", welcome);
    speak(welcome);
  }, 600);
});
