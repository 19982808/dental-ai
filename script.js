// ================================================
// RYNAR DENTAL AI — updated script.js
// ================================================

// ── Clinic Info ─────────────────────────────────
const CLINIC_WA = "254757902314";

// ── State ──────────────────────────────────────
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

// ── Booking Fields ─────────────────────────────
const FIELDS = ["name", "phone", "date", "time", "service"];
const PROMPTS = {
  name:    "What's your full name?",
  phone:   "What's your WhatsApp number? (with country code, e.g. +254…)",
  date:    "What date would you like to come in?",
  time:    "Morning or afternoon — or a specific time?",
  service: "What are you coming in for? Checkup, cleaning, whitening, braces consult, extraction, or something else?"
};

// ── Dental Knowledge Base ──────────────────────
const DENTAL_KNOWLEDGE = {
  fillings: {
    desc: "A filling fixes cavities — tiny holes in your teeth caused by decay. It stops pain and prevents bigger issues later. 🦷",
    symptoms: ["sensitivity to sweets", "sharp pain when biting", "small visible hole in tooth"],
    images: ["dental filling diagram","tooth cavity illustration","tooth cross section cavity"]
  },
  root_canal: {
    desc: "A root canal treats infected pulp inside a tooth. It removes pain, prevents abscesses, and saves your tooth. ⚡",
    symptoms: ["persistent toothache","sensitivity to hot/cold","swollen gums","discoloration of tooth"],
    images: ["root canal procedure diagram","tooth pulp infection illustration","endodontic treatment diagram"]
  },
  crown: {
    desc: "A crown is a cap that restores a damaged tooth — strengthens it and keeps it looking natural. 👑",
    symptoms: ["broken tooth","large filling replacement","weak tooth prone to cracking"],
    images: ["dental crown diagram","tooth crown placement illustration"]
  },
  implant: {
    desc: "A dental implant replaces a missing tooth with an artificial root + crown. Looks and works like a real tooth. 🌱",
    symptoms: ["missing tooth","difficulty chewing","bone loss nearby"],
    images: ["dental implant diagram","tooth implant placement illustration"]
  },
  braces: {
    desc: "Braces gradually move teeth into the right position. Metal, ceramic, or clear aligners (Invisalign). 😁",
    symptoms: ["crooked teeth","bite misalignment","spacing or crowding"],
    images: ["braces diagram","before and after braces illustration"]
  },
  invisalign: {
    desc: "Clear removable aligners that straighten teeth without metal braces. Subtle and comfy! 🌟",
    symptoms: ["mild teeth misalignment","spacing issues","crowding"],
    images: ["invisalign aligners diagram","clear aligners teeth illustration"]
  },
  cleaning: {
    desc: "Professional cleaning removes plaque & tartar to prevent cavities and gum disease. 🪥✨",
    symptoms: ["yellowing teeth","gum bleeding","bad breath"],
    images: ["dental cleaning diagram","scaling polishing illustration"]
  },
  whitening: {
    desc: "Teeth whitening brightens your smile with safe bleaching treatments. 😁💎",
    symptoms: ["stained teeth","dull smile","coffee/tea discoloration"],
    images: ["teeth whitening diagram","before and after whitening illustration"]
  },
  extraction: {
    desc: "Removing a tooth safely when it’s damaged, infected, or causing crowding. 🦷🚀",
    symptoms: ["severe decay","painful tooth","infection","wisdom teeth issues"],
    images: ["tooth extraction diagram","wisdom tooth removal illustration"]
  },
  gum_disease: {
    desc: "Gum disease causes redness, swelling, bleeding, and can affect your teeth if untreated. 🌿",
    symptoms: ["bleeding gums","swelling","bad breath","loose teeth"],
    images: ["gum disease diagram","gingivitis illustration"]
  }
};

// ── Conversational Flow ───────────────────────
const SYSTEM = {
  greetings: [
    "Hey there! 🦷 Ready to make your smile sparkle? 😁",
    "Hello! I’m Rynar, your dental buddy — let’s talk teeth! 😎",
    "Hi! Got any toothaches or shiny smiles to discuss today? 🪥",
    "Hey! Fancy a little dental chat? I promise to be fun and gentle 😏"
  ],
  jokes: [
    "Why did the tooth go to the party alone? Because it couldn’t find its *cavity* partner! 😂",
    "I told my tooth a joke… it didn’t *bite* 😂",
    "Why do dentists seem moody? They always look down in the mouth 😎"
  ]
};

// ── Voice Setup ───────────────────────────────
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
  btn?.classList.toggle("on", voiceOn);
  btn.textContent = voiceOn ? "🔊" : "🔇";
  if (!voiceOn) speechSynthesis.cancel();
}

// ── Jazz Background ───────────────────────────
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
  document.getElementById("jazzBtn")?.classList.toggle("on", jazzOn);
  jazzOn ? startJazz() : stopJazz();
}

// ── Conversation Engine ───────────────────────
function askDentalAI(userMsg) {
  const msg = userMsg.toLowerCase();

  // Check greetings
  if (/\b(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/i.test(msg)) {
    const reply = SYSTEM.greetings[Math.floor(Math.random() * SYSTEM.greetings.length)];
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  // Check for dental procedure keywords
  for (const proc in DENTAL_KNOWLEDGE) {
    if (msg.includes(proc.replace("_"," "))) {
      const k = DENTAL_KNOWLEDGE[proc];
      appendMessage("ai", `<b>${proc.replace("_"," ").toUpperCase()}</b>: ${k.desc}`);
      speak(k.desc);

      // Add image group if major procedure
      if (["fillings","root_canal","crown","implant","braces","invisalign"].includes(proc)) {
        const imgs = k.images.map(i => `<img src="https://via.placeholder.com/180?text=${encodeURIComponent(i)}" style="border-radius:8px;margin:4px">`).join("");
        const div  = document.createElement("div");
        div.innerHTML = imgs;
        div.className = "image-group";
        document.getElementById("chat-box")?.appendChild(div);
      }

      const sympMsg = "Do you feel: " + k.symptoms.join(", ") + "?";
      appendMessage("ai", sympMsg);
      speak(sympMsg);
      return;
    }
  }

  // Toothache fallback
  if (msg.includes("ache") || msg.includes("pain")) {
    const reply = "Oh no! 😖 Let's see what’s happening. Can you tell me if it's sharp, dull, or sensitive to hot/cold?";
    appendMessage("ai", reply);
    speak(reply);
    return;
  }

  // Random dental joke
  if (Math.random() < 0.2) {
    const joke = SYSTEM.jokes[Math.floor(Math.random() * SYSTEM.jokes.length)];
    appendMessage("ai", joke);
    speak(joke);
    return;
  }

  // Default small talk
  const smallTalk = ["Tell me more!", "Interesting… 😏", "Haha, I like that!", "Can you elaborate a bit?"];
  const reply = smallTalk[Math.floor(Math.random() * smallTalk.length)];
  appendMessage("ai", reply);
  speak(reply);
}

// ── Send Message ──────────────────────────────
function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMessage("user", text);
  askDentalAI(text);
}

// ── Append Message ────────────────────────────
function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerHTML = text.replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ── Voice Input ──────────────────────────────
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { appendMessage("ai","Voice input works best in Chrome 😅"); return; }

  navigator.mediaDevices.getUserMedia({ audio:true }).then(() => {
    const r = new SR();
    r.lang = "en-US";
    const micBtn = document.getElementById("micBtn");
    micBtn?.classList.add("listening");
    r.start();

    r.onresult = e => {
      const transcript = e.results[0][0].transcript;
      document.getElementById("user-input").value = transcript;
      micBtn?.classList.remove("listening");
      sendMessage();
    };
    r.onerror = e => { micBtn?.classList.remove("listening"); appendMessage("ai","Mic error 😅"); };
    r.onend = () => { micBtn?.classList.remove("listening"); };
  }).catch(()=>appendMessage("ai","Allow microphone access to use voice input 😅"));
}

// ── Boot ─────────────────────────────────────
window.addEventListener("load", ()=>{
  loadVoices();
  appendMessage("ai", SYSTEM.greetings[Math.floor(Math.random()*SYSTEM.greetings.length)]);
  speak(chatHistory[chatHistory.length-1]?.content || "");
  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("user-input")?.addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });
  document.getElementById("voiceBtn")?.addEventListener("click", toggleVoice);
  document.getElementById("jazzBtn")?.addEventListener("click", toggleJazz);
  document.getElementById("micBtn")?.addEventListener("click", startListening);
});
