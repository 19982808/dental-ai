// ================================================
// RYNAR DENTAL AI — script.js (Fully Frontend)
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

// Booking fields
const FIELDS = ["name", "phone", "date", "time", "service"];
const PROMPTS = {
  name:    "What's your full name?",
  phone:   "What's your WhatsApp number? (with country code, e.g. +254…)",
  date:    "What date would you like to come in?",
  time:    "Morning or afternoon — or a specific time?",
  service: "What are you coming in for? Checkup, cleaning, whitening, braces consult, extraction, or something else?"
};

// ── Frontend conversational AI knowledge ───────────
const DENTAL_KB = {
  "whitening": "Teeth whitening can brighten your smile in just one visit or with take-home kits. 😁 Want me to explain the options?",
  "braces": "Braces straighten teeth over time — we offer traditional metal braces and Invisalign clear aligners.",
  "invisalign": "Invisalign is discreet and effective. I can explain the steps if you're curious!",
  "implants": "Dental implants replace missing teeth permanently and look completely natural.",
  "root canal": "Root canals are painless with anaesthetic and save your tooth. Don't worry, I’ll reassure you throughout!",
  "extraction": "Tooth extractions are safe and quick with proper anaesthetic. We always make it comfortable.",
  "veneers": "Veneers can give you that perfect smile — think Hollywood smiles!",
  "gum disease": "Gum health is key. Regular cleanings and brushing prevent most problems.",
  "kids": "Children’s dental care is important — we make it fun and gentle for little ones!",
  "emergency": "Dental emergencies need prompt care. If pain is severe, visit us as soon as possible.",
  "hygiene": "Brushing twice a day, flossing, and regular checkups keep teeth and gums healthy."
};

// ── System helper for name memory ───────────────
function recall(field) {
  return patientDraft[field] || null;
}

// ── VOICE — Web Speech API, deep male ─────────────
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

// ── JAZZ — Web Audio API ─────────────────────────
function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
const CHORDS = [[62,65,69,74],[67,71,74,77],[65,69,72,76],[65,69,72,76],[60,63,67,70],[65,69,72,75],[58,62,65,69],[58,62,65,69]];
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
  const now = audioCtx.currentTime;
  const beat = 1.15;
  const ch = CHORDS[chordIdx % CHORDS.length];
  ch.forEach((m, i) => playNote(m, now, beat*1.7, "sine", 0.034 - i*0.005));
  playNote(BASS[chordIdx % BASS.length]-12, now, beat*1.6, "triangle", 0.07);
  if(Math.random()>0.42) {
    const pent=[0,2,4,7,9];
    const note = ch[0]+pent[Math.floor(Math.random()*pent.length)]+12;
    playNote(note, now + Math.random()*beat*0.5, 0.3+Math.random()*0.5,"sine",0.022);
  }
  chordIdx++;
}

function startJazz() {
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state==="suspended") audioCtx.resume();
  masterGain = audioCtx.createGain();
  masterGain.gain.value=0.5;
  const delay = audioCtx.createDelay(2);
  const fb = audioCtx.createGain();
  const wet = audioCtx.createGain();
  delay.delayTime.value = 0.3;
  fb.gain.value = 0.32;
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
  if(masterGain){ masterGain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.8);
    setTimeout(()=>{try{masterGain.disconnect()}catch(e){}},1000);
  }
}

function toggleJazz() {
  jazzOn = !jazzOn;
  document.getElementById("jazzBtn").classList.toggle("on", jazzOn);
  jazzOn ? startJazz() : stopJazz();
}

// ── FRONTEND AI CONVERSATION FLOW ─────────────
async function askAI(userMsg) {
  showTyping(true);
  const userName = recall("name");

  let reply = "";
  const msg = userMsg.toLowerCase();

  // Greeting
  if(/^(hi|hello|hey|yo|sup)/i.test(msg)) {
    reply = userName ? `Hey ${userName}! How’s your smile today? 😁` : "Hey! How’s your smile today? 😁";
  } else if(/(toothache|pain|ache|sore)/i.test(msg)) {
    reply = `Oh no! 😣 Tooth pain is the worst. Can you tell me where it hurts most? We’ll figure out how to ease it.`;
  } else if(/(sensitive teeth|sensitivity)/i.test(msg)) {
    reply = `Sensitive teeth can be tricky! 🦷 I can share some tips to help and recommend gentle products.`;
  } else if(/(book|appointment|schedule|visit|reserve)/i.test(msg)) {
    awaitingField = "name";
    reply = `Sure! Let’s get you booked. ${PROMPTS.name}`;
  } else {
    // Dental KB lookup
    const keyword = Object.keys(DENTAL_KB).find(k => msg.includes(k));
    if(keyword) reply = DENTAL_KB[keyword];
    else {
      const flowReplies = [
        "😏 That’s interesting, tell me more!",
        "Haha, I like the way you think 😄",
        "You have a way of making dental chat fun!",
        "Alright, spill the toothpaste 😎"
      ];
      reply = flowReplies[Math.floor(Math.random() * flowReplies.length)];
    }
  }

  if(userName && !reply.startsWith(userName)) reply = `${userName}, ${reply}`;

  chatHistory.push({ role:"user", content:userMsg });
  chatHistory.push({ role:"assistant", content:reply });

  showTyping(false);
  return reply;
}

// ── SEND MESSAGE ─────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if(!text) return;
  input.value = "";

  appendMessage("user", text);

  // Booking flow
  if(awaitingField){ await handleBookingField(text); return; }

  // Image trigger
  if(/\b(photo|picture|image|look at|my teeth|my smile|upload|show you)\b/i.test(text)) {
    const reply = "Of course — tap the 📷 button and upload your photo. I'll take a careful look 😊";
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  const reply = await askAI(text);
  appendMessage("ai", reply);
  speak(reply);
}

// ── BOOKING FLOW ───────────────────────────────
async function handleBookingField(value){
  patientDraft[awaitingField] = value;
  const idx = FIELDS.indexOf(awaitingField);
  if(idx < FIELDS.length-1){
    awaitingField = FIELDS[idx+1];
    appendMessage("ai", PROMPTS[awaitingField]);
    speak(PROMPTS[awaitingField]);
  } else await confirmBooking();
}

async function confirmBooking() {
  const b = patientDraft;
  const id = "RD"+Date.now().toString().slice(-5);
  const bkg = {id,...b, bookedAt:new Date().toLocaleString()};
  bookings.push(bkg);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();

  const patientMsg = encodeURIComponent(
    `✅ *Rynar Dental — Booking Confirmed*\n\n`+
    `📋 Ref: ${id}\n👤 ${b.name}\n📅 ${b.date} at ${b.time}\n🦷 ${b.service}\n\n`+
    `We look forward to seeing your smile!`
  );

  const clinicMsg = encodeURIComponent(
    `🦷 *New Booking — Rynar Dental*\n\n`+
    `Ref: ${id}\nPatient: ${b.name}\nPhone: ${b.phone}\nDate: ${b.date} at ${b.time}\nService: ${b.service}\nBooked: ${bkg.bookedAt}`
  );

  const waPatient = `https://wa.me/${b.phone.replace(/\D/g,"")}?text=${patientMsg}`;
  const waClinic = `https://wa.me/${CLINIC_WA}?text=${clinicMsg}`;

  const reply = `All done, ${b.name}! ✅ You're booked for ${b.date} at ${b.time} — ${b.service}. Tap below for WhatsApp confirmation 👇`;
  appendMessage("ai", reply);
  speak(`All done ${b.name}, you're booked for ${b.date} at ${b.time}. See you soon!`);

  const box = document.getElementById("chat-box");

  const a1 = document.createElement("a");
  a1.href = waPatient; a1.target="_blank"; a1.className="wa-btn";
  a1.innerHTML="📲 Send My Confirmation on WhatsApp";
  box.appendChild(a1);

  const a2 = document.createElement("a");
  a2.href = waClinic; a2.target="_blank"; a2.className="wa-btn clinic";
  a2.innerHTML="🏥 Notify Clinic on WhatsApp";
  box.appendChild(a2);

  box.scrollTop = box.scrollHeight;
  patientDraft={};
}

// ── IMAGE UPLOAD ───────────────────────────────
async function handleImageUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  e.target.value = "";

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const b64 = ev.target.result;
    const box = document.getElementById("chat-box");
    const wrap = document.createElement("div");
    wrap.className = "message user";
    const img = document.createElement("img");
    img.src = b64;
    img.style.cssText="max-width:190px;border-radius:10px;margin-top:4px;display:block";
    wrap.appendChild(img);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;

    const reply = await askAI("Please analyse this smile photo.");
    appendMessage("ai", reply);
    speak(reply);
  };
  reader.readAsDataURL(file);
}

// ── ADMIN / BOOKINGS TABLE ──────────────────────
function toggleAdmin(){
  const cv=document.getElementById("chatView");
  const av=document.getElementById("adminView");
  const showing = av.style.display==="block";
  cv.style.display = showing ? "flex":"none";
  av.style.display = showing ? "none":"block";
  if(!showing) renderBookings();
}

function renderBookings(){
  const tbody=document.getElementById("bookingBody");
  const empty=document.getElementById("emptyMsg");
  tbody.innerHTML="";
  if(!bookings.length){ empty.style.display="block"; return; }
  empty.style.display="none";
  bookings.forEach((b,i)=>{
    const phone=b.phone.replace(/\D/g,"");
    const msg=encodeURIComponent(`Hi ${b.name}, confirming your Rynar Dental appointment on ${b.date} at ${b.time}. See you soon! 😊`);
    const tr=document.createElement("tr");
    tr.innerHTML=`
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

function deleteBooking(i){
  if(!confirm("Remove this booking?")) return;
  bookings.splice(i,1);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();
}

// ── VOICE INPUT ───────────────────────────────
function startListening(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ appendMessage("ai","Voice input works best in Chrome 😊"); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(()=>{
    const r=new SR();
    r.lang="en-US";
    const micBtn=document.getElementById("micBtn");
    const label=micBtn ? micBtn.querySelector(".btn-label"):null;
    if(micBtn) micBtn.classList.add("listening");
    if(label) label.textContent="Listening…";
    r.start();
    r.onresult = e=>{
      const transcript = e.results[0][0].transcript;
      document.getElementById("user-input").value = transcript;
      if(micBtn) micBtn.classList.remove("listening");
      if(label) label.textContent="Tap to speak";
      sendMessage();
    };
    r.onerror=e=>{
      if(micBtn) micBtn.classList.remove("listening");
      if(label) label.textContent="Tap to speak";
      if(e.error==="not-allowed") appendMessage("ai","Mic access blocked — please allow microphone permission.");
    };
    r.onend = ()=>{ if(micBtn) micBtn.classList.remove("listening"); if(label) label.textContent="Tap to speak"; };
  }).catch(()=>appendMessage("ai","I need microphone access — please allow it in your browser settings."));
}

// ── HELPERS ───────────────────────────────────
function appendMessage(sender,text){
  const box=document.getElementById("chat-box");
  const div=document.createElement("div");
  div.className="message "+sender;
  div.innerHTML=text.replace(/\*([^*]+)\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>");
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}

function showTyping(show){
  document.getElementById("typing-indicator").classList.toggle("hidden",!show);
  if(show) document.getElementById("chat-box").scrollTop=9999;
}

// ── BOOT ──────────────────────────────────────
window.addEventListener("load",()=>{
  loadVoices();
  renderBookings();
  setTimeout(()=>{
    loadVoices();
    const greet = "Hello… I'm Rynar,
