// ================================================
// RYNAR DENTAL AI — script.js v3
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
const SYSTEM = `You are Rynar — the AI dental assistant for Rynar Dental, a premium clinic.

PERSONALITY:
Warm, calm, reassuring. Like a knowledgeable friend who happens to be a dental expert.
You ease dental anxiety naturally. You use the patient's name once you know it.
You keep conversations flowing naturally — never robotic.

DENTAL EXPERTISE — you know everything about:
- All 32 teeth and their numbers (FDI & Universal numbering systems)
- Tooth anatomy: enamel, dentine, pulp, cementum, periodontal ligament
- Conditions: caries, gingivitis, periodontitis, abscess, bruxism, malocclusion, TMJ disorders
- Treatments: fillings, root canals, extractions, implants, crowns, bridges, veneers, whitening, braces, Invisalign, sealants, scaling, bone grafts
- Pain management: ibuprofen dosing, clove oil, cold compress, salt rinse
- Emergency protocols: knocked out tooth (replant within 30min), cracked tooth, dental abscess (urgent)
- X-ray types: periapical, bitewing, panoramic, CBCT
- Paediatric dentistry: first visit at 12 months, fluoride, sealants, space maintainers
- Orthodontics: Angles classification, overbite, crossbite, crowding

SYMPTOM DIAGNOSIS APPROACH:
When a patient describes symptoms, assess the likely condition, urgency level, and recommended action.
Always recommend professional evaluation while giving helpful interim advice.
Mention pain management if relevant (ibuprofen 400mg with food, clove oil for toothache, cold compress for swelling).

CONVERSATION RULES:
- Keep responses to 1-3 sentences for simple questions
- Never use bullet points in casual chat
- Greet warmly if they say hi — ask what's going on with their smile
- Never say "As an AI" — you are Rynar
- Gently suggest booking when relevant
- If they describe severe pain, swelling, or trauma — flag it as urgent`;

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
  if (masterGain) { masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.8); setTimeout(()=>{ try{masterGain.disconnect();}catch(e){} },1000); }
}

function toggleJazz() {
  const btn = document.getElementById("jazzBtn");
  jazzOn = !jazzOn; btn.classList.toggle("on", jazzOn);
  jazzOn ? startJazz() : stopJazz();
}

// ════════════════════════════════════════════════
// AI CALL
// ════════════════════════════════════════════════
async function askAI(userMsg, imageBase64=null) {
  showTyping(true);
  const userContent = imageBase64
    ? "The patient has uploaded a photo of their smile/teeth. Give warm observational feedback, note anything worth a professional look, and recommend a consultation."
    : userMsg;
  chatHistory.push({ role:"user", content: userContent });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  try {
    const res = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"llama3-8b-8192",
        messages:[{role:"system",content:SYSTEM},...chatHistory],
        temperature:0.78, max_tokens:280, frequency_penalty:0.5, presence_penalty:0.3
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showTyping(false);
      if (res.status===401) return "⚠️ API key issue — check GROQ_API_KEY in Vercel environment variables.";
      if (res.status===429) return "Getting a lot of requests right now — try again in a moment.";
      return "Something went wrong — try again?";
    }
    const reply = data.choices[0].message.content.trim();
    chatHistory.push({role:"assistant",content:reply});
    showTyping(false);
    return reply;
  } catch(e) {
    showTyping(false);
    console.error("Fetch error:",e);
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

  if (/\b(symptom|pain|ache|hurt|sore|bleed|sensitive|swell)\b/i.test(text)) {
    const reply = "Let me help you figure out what's going on. Tap the 🩺 Symptoms tab for a detailed checker, or just describe what you're feeling and I'll assess it.";
    appendMessage("ai", reply); speak(reply);
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
  if (idx < FIELDS.length-1) {
    awaitingField = FIELDS[idx+1];
    appendMessage("ai", PROMPTS[awaitingField]);
    speak(PROMPTS[awaitingField]);
  } else {
    awaitingField = null;
    await confirmBooking();
  }
}

async function confirmBooking() {
  const b = patientDraft;
  const id = "RD" + Date.now().toString().slice(-5);
  const booking = {id, ...b, bookedAt: new Date().toLocaleString()};
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
  a1.href = waPatient; a1.target="_blank"; a1.className="wa-btn";
  a1.innerHTML = "📲 Send My Confirmation on WhatsApp";
  box.appendChild(a1);

  const a2 = document.createElement("a");
  a2.href = waClinic; a2.target="_blank"; a2.className="wa-btn clinic";
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
  const grid = document.getElementById("symptomGrid");
  grid.innerHTML = "";
  SYMPTOMS.forEach(s => {
    const chip = document.createElement("div");
    chip.className = "symptom-chip";
    chip.dataset.id = s.id;
    chip.innerHTML = `<span class="chip-icon">${s.icon}</span>${s.label}`;
    chip.onclick = () => chip.classList.toggle("selected");
    grid.appendChild(chip);
  });
}

async function diagnose() {
  const selected = [...document.querySelectorAll(".symptom-chip.selected")].map(c => c.textContent.trim());
  const other    = document.getElementById("symptomOther").value.trim();
  if (!selected.length && !other) { alert("Please select at least one symptom."); return; }

  const symptoms = [...selected, other].filter(Boolean).join(", ");
  const box = document.getElementById("diagnosisResult");
  box.classList.remove("hidden");
  box.innerHTML = `<h3>🔍 Analysing your symptoms…</h3><p style="color:var(--muted);font-size:13px">Please wait…</p>`;

  const prompt = `Patient symptoms: ${symptoms}. 
Please respond in this exact JSON format:
{
  "summary": "brief 1-sentence overview",
  "conditions": [
    {
      "name": "condition name",
      "emoji": "single relevant emoji",
      "description": "2-sentence explanation",
      "urgency": "urgent|moderate|routine",
      "action": "recommended action"
    }
  ],
  "pain_relief": "immediate pain management tip if relevant",
  "book_message": "warm 1-sentence encouragement to book"
}
Provide 1-3 most likely conditions. Be warm and reassuring, not alarming.`;

  const raw = await askAI(prompt);

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    let html = `<h3>🩺 ${data.summary}</h3>`;
    (data.conditions || []).forEach(c => {
      html += `<div class="dx-item">
        <div class="dx-icon">${c.emoji}</div>
        <div class="dx-info">
          <h4>${c.name}</h4>
          <p>${c.description}</p>
          <p><strong style="color:var(--teal)">Recommended: </strong>${c.action}</p>
          <span class="dx-urgency ${c.urgency}">${c.urgency === "urgent" ? "⚠️ Urgent" : c.urgency === "moderate" ? "📅 See dentist soon" : "✅ Routine"}</span>
        </div>
      </div>`;
    });

    if (data.pain_relief) {
      html += `<div class="pain-tip">💊 <strong>Pain relief:</strong> ${data.pain_relief}</div>`;
    }

    html += `<p style="font-size:13px;color:var(--muted);margin-bottom:12px">${data.book_message || "Booking an appointment is the best next step."}</p>`;
    html += `<div class="dx-actions">
      <button class="dx-btn primary" onclick="showView('chat');awaitingField='name';appendMessage('ai','${PROMPTS.name}');speak('${PROMPTS.name}')">📅 Book Appointment</button>
      <button class="dx-btn secondary" onclick="showView('chat')">💬 Ask Rynar</button>
    </div>`;

    box.innerHTML = html;
  } catch(e) {
    box.innerHTML = `<h3>🩺 Assessment</h3><p style="font-size:14px;line-height:1.6;color:var(--text)">${raw}</p>
      <div class="dx-actions">
        <button class="dx-btn primary" onclick="showView('chat');awaitingField='name';appendMessage('ai','${PROMPTS.name}');speak('${PROMPTS.name}')">📅 Book Appointment</button>
      </div>`;
  }
}

// ════════════════════════════════════════════════
// TREATMENT GUIDES
// ════════════════════════════════════════════════
function buildGuides() {
  const grid = document.getElementById("guidesGrid");
  grid.innerHTML = "";
  GUIDES.forEach(g => {
    const card = document.createElement("div");
    card.className = "guide-card";
    card.innerHTML = `<span class="guide-emoji">${g.emoji}</span><h3>${g.title}</h3><p>${g.tagline}</p>`;
    card.onclick = () => showGuideDetail(g.id);
    grid.appendChild(card);
  });
}

function showGuideDetail(id) {
  const g = GUIDES.find(g => g.id === id);
  if (!g) return;
  const stepsHtml = g.steps.map((s,i) => `<li data-n="${i+1}">${s}</li>`).join("");
  document.getElementById("guideDetail").innerHTML = `
    <span class="guide-detail-emoji">${g.emoji}</span>
    <div class="guide-detail">
      <h2>${g.title}</h2>
      <p style="color:var(--teal);font-size:12px;margin-bottom:10px">⏱ ${g.duration} &nbsp;|&nbsp; 📅 ${g.sessions}</p>
      <p>${g.desc}</p>
      <div class="pain-tip">💊 <strong>Pain tip:</strong> ${g.pain}</div>
      <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">What happens step by step:</p>
      <ul class="guide-steps">${stepsHtml}</ul>
    </div>`;
  showView("guide-detail");
}

// ════════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════════
function buildPaymentCards() {
  const container = document.getElementById("paymentCards");
  container.innerHTML = "";
  PLANS.forEach(p => {
    const card = document.createElement("div");
    card.className = "pay-card" + (p.featured ? " featured" : "");
    const priceHtml = p.currency
      ? `<div class="pay-price"><span class="pay-currency">${p.currency}</span>${p.price}</div>`
      : `<div class="pay-price">${p.price}</div>`;
    const badgeHtml = p.featured ? `<span class="pay-badge">Popular</span>` : "";
    const featuresHtml = p.features.map(f => `<li>${f}</li>`).join("");
    card.innerHTML = `
      <div class="pay-card-header"><h3>${p.title}${badgeHtml}</h3>${priceHtml}</div>
      <p>${p.desc}</p>
      <ul class="pay-features">${featuresHtml}</ul>
      ${p.id !== "ai_consult" ? `<button class="pay-btn" onclick="selectPlan('${p.id}')">Book This →</button>` : ""}`;
    container.appendChild(card);
  });
}

function selectPlan(planId) {
  selectedPlan = PLANS.find(p => p.id === planId);
  if (!selectedPlan) return;
  document.getElementById("paymentCards").style.display = "none";
  document.getElementById("paymentForm").classList.remove("hidden");
  document.getElementById("payFormTitle").textContent = `Complete: ${selectedPlan.title}`;
  document.getElementById("selectedPlanDisplay").textContent =
    `${selectedPlan.title} — ${selectedPlan.currency} ${selectedPlan.price}`;
}

function processPayment() {
  const name  = document.getElementById("payName").value.trim();
  const phone = document.getElementById("payPhone").value.trim();
  const email = document.getElementById("payEmail").value.trim();
  if (!name || !phone) { alert("Please fill in your name and WhatsApp number."); return; }

  const msg = encodeURIComponent(
    `💳 *Rynar Dental — ${selectedPlan.title}*\n\n` +
    `👤 Name: ${name}\n📱 Phone: ${phone}\n📧 Email: ${email || "—"}\n` +
    `💰 Amount: ${selectedPlan.currency} ${selectedPlan.price}\n\n` +
    `Please send payment details and confirm my booking. Thank you!`
  );
  window.open(`https://wa.me/${CLINIC_WA}?text=${msg}`, "_blank");

  document.getElementById("paymentForm").classList.add("hidden");
  document.getElementById("paymentCards").style.display = "flex";
  document.getElementById("paymentCards").style.flexDirection = "column";

  showView("chat");
  const reply = `Thanks ${name}! 🙏 Your ${selectedPlan.title} request has been sent to the clinic on WhatsApp. They'll confirm your booking and share payment details shortly.`;
  appendMessage("ai", reply);
  speak(reply);
}

// ════════════════════════════════════════════════
// GALLERY
// ════════════════════════════════════════════════
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!gallery.length) {
    grid.innerHTML = `<div class="gallery-empty">No photos yet — upload a smile photo to get started.</div>`;
    return;
  }
  grid.innerHTML = "";
  gallery.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "gallery-item";
    div.innerHTML = `<img src="${item.src}" alt="Smile photo"/><div class="gallery-item-label">${item.date}</div><button class="del-img" onclick="deleteGalleryItem(${i})">✕</button>`;
    grid.appendChild(div);
  });
}

function handleGalleryUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  const reader = new FileReader();
  reader.onload = ev => {
    gallery.push({ src: ev.target.result, date: new Date().toLocaleDateString() });
    localStorage.setItem("rynar_gallery", JSON.stringify(gallery));
    renderGallery();
  };
  reader.readAsDataURL(file);
}

function deleteGalleryItem(i) {
  if (!confirm("Remove this photo?")) return;
  gallery.splice(i,1);
  localStorage.setItem("rynar_gallery", JSON.stringify(gallery));
  renderGallery();
}

// ════════════════════════════════════════════════
// IMAGE UPLOAD (chat)
// ════════════════════════════════════════════════
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  showView("chat");
  const reader = new FileReader();
  reader.onload = async ev => {
    const b64  = ev.target.result;
    // Save to gallery
    gallery.push({ src: b64, date: new Date().toLocaleDateString() });
    localStorage.setItem("rynar_gallery", JSON.stringify(gallery));

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
function renderBookings() {
  const tbody = document.getElementById("bookingBody");
  const empty = document.getElementById("emptyMsg");
  tbody.innerHTML = "";
  if (!bookings.length) { empty.style.display="block"; return; }
  empty.style.display = "none";
  bookings.forEach((b,i) => {
    const phone = b.phone.replace(/\D/g,"");
    const msg   = encodeURIComponent(`Hi ${b.name}, confirming your Rynar Dental appointment on ${b.date} at ${b.time}. See you soon! 😊`);
    const tr    = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size:11px;color:var(--muted)">${b.id}</td>
      <td><strong>${b.name}</strong><br><small>${b.service}</small><br><small>${b.phone}</small></td>
      <td>${b.date}<br><small>${b.time}</small></td>
      <td>
        <a href="https://wa.me/${phone}?text=${msg}" target="_blank" class="wa-icon">📲</a>
        <button class="del-btn" onclick="deleteBooking(${i})">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function deleteBooking(i) {
  if (!confirm("Remove this booking?")) return;
  bookings.splice(i,1);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();
}

// ════════════════════════════════════════════════
// VOICE INPUT
// ════════════════════════════════════════════════
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { appendMessage("ai","Voice input works best in Chrome 😊"); return; }
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
        const t = e.results[0][0].transcript;
        document.getElementById("user-input").value = t;
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
        sendMessage();
      };
      r.onerror = e => {
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
        if (e.error === "not-allowed")
          appendMessage("ai","Mic access was blocked — please allow microphone permission in your browser settings.");
      };
      r.onend = () => {
        if (micBtn) micBtn.classList.remove("listening");
        if (label)  label.textContent = "Tap to speak";
      };
    })
    .catch(() => appendMessage("ai","I need microphone access — please allow it in your browser settings."));
}

// ════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════
function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerHTML = text.replace(/\*([^*]+)\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showTyping(show) {
  document.getElementById("typing-indicator").classList.toggle("hidden",!show);
  if (show) document.getElementById("chat-box").scrollTop = 9999;
}

// ════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════
window.addEventListener("load", () => {
  loadVoices();
  buildSymptomGrid();
  buildGuides();
  buildPaymentCards();
  renderBookings();
  renderGallery();

  setTimeout(() => {
    loadVoices();
    const greet = "Hello! I'm Rynar, your personal dental AI 🦷 I can help with symptoms, treatments, bookings, and more. What's going on with your smile today?";
    appendMessage("ai", greet);
    setTimeout(() => speak(greet), 400);
  }, 700);
});
