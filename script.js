// ==========================
// 🔐 CONFIG
// ==========================
const API_KEY = "AIzaSyCv9vt4fIty-hNuqmOPGV1E2Kl5ON9HOqA"; 

// ==========================
// 🔥 FIREBASE
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyBeKmA7f8vHyp9ixFXv0B4mINmanVNvVGA",
  authDomain: "rynardental-68613.firebaseapp.com",
  projectId: "rynardental-68613",
  storageBucket: "rynardental-68613.firebasestorage.app",
  messagingSenderId: "789923911514",
  appId: "1:789923911514:web:da65c19f7c8c7060964563"
};

let db = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
} catch(e){
  console.warn("Firebase not available");
}

// ==========================
// 🧠 MEMORY
// ==========================
let memory = {
  name: null,
  issue: null,
  painLevel: null
};

let conversationHistory = [];

const USER_ID = localStorage.getItem("ryn_user") || "user_" + Date.now();
localStorage.setItem("ryn_user", USER_ID);

// LOAD MEMORY
async function loadMemory(){
  try{
    if(!db) return;
    const doc = await db.collection("patients").doc(USER_ID).get();
    if(doc.exists){
      memory = doc.data();
    }
  }catch(e){}
}

// SAVE MEMORY
async function saveMemory(){
  try{
    if(!db) return;
    await db.collection("patients").doc(USER_ID).set(memory);
  }catch(e){}
}

// ==========================
// 📊 BOOKINGS
// ==========================
async function addBooking(name, date){
  try{
    if(!db) return;
    await db.collection("bookings").add({
      name,
      date,
      userId: USER_ID,
      timestamp: new Date()
    });
  }catch(e){}
}

function listenBookings(){
  try{
    if(!db) return;

    const body = document.getElementById("bookingBody");
    const empty = document.getElementById("emptyMsg");

    if(!body || !empty) return;

    db.collection("bookings")
      .orderBy("timestamp", "desc")
      .onSnapshot(snapshot => {

        body.innerHTML = "";

        if(snapshot.empty){
          empty.style.display = "block";
          return;
        }

        empty.style.display = "none";

        let i = 1;

        snapshot.forEach(doc => {
          const b = doc.data();

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${i++}</td>
            <td>${b.name}</td>
            <td>${b.date}</td>
            <td><button onclick="deleteBooking('${doc.id}')">Delete</button></td>
          `;
          body.appendChild(row);
        });
      });

  }catch(e){}
}

// ==========================
// 💬 UI
// ==========================
function addMessage(text, sender){
  const chat = document.getElementById("chat-box");
  if(!chat) return;

  const div = document.createElement("div");
  div.className = "message " + sender;
  div.innerText = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping(){
  const el = document.getElementById("typing-indicator");
  if(el) el.classList.remove("hidden");
}

function hideTyping(){
  const el = document.getElementById("typing-indicator");
  if(el) el.classList.add("hidden");
}

// ==========================
// 🎷 MUSIC
// ==========================
function startMusic(){
  const music = document.getElementById("bg-music");
  if(music){
    music.volume = 0.15;
    if(music.paused){
      music.play().catch(()=>{});
    }
  }
}

// ==========================
// 🎙️ VOICE (ELITE)
// ==========================
function speak(text){
  try{
    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.pitch = 0.5;
    speech.rate = 0.8;
    speech.volume = 1;

    const voices = speechSynthesis.getVoices();

    const deepVoice = voices.find(v =>
      v.name.toLowerCase().includes("david") ||
      v.name.toLowerCase().includes("male")
    );

    speech.voice = deepVoice || voices[0];

    speechSynthesis.speak(speech);

  }catch(e){}
}

// ==========================
// 🧠 EMOTION DETECTION
// ==========================
function detectEmotion(msg){
  msg = msg.toLowerCase();

  if(msg.includes("scared") || msg.includes("afraid") || msg.includes("nervous")){
    return "anxious";
  }

  if(msg.includes("pain") || msg.includes("hurt") || msg.includes("ache")){
    return "in_pain";
  }

  if(msg.includes("book") || msg.includes("appointment")){
    return "ready_to_book";
  }

  if(msg.includes("hi") || msg.includes("hello")){
    return "casual";
  }

  return "neutral";
}

// ==========================
// 🧠 TRIAGE
// ==========================
function analyzeSymptoms(msg){
  msg = msg.toLowerCase();

  let severity = "low";

  if(msg.includes("swelling") || msg.includes("pus") || msg.includes("unbearable")){
    severity = "high";
  } else if(msg.includes("pain") || msg.includes("ache")){
    severity = "medium";
  }

  memory.issue = msg;
  memory.painLevel = severity;
  saveMemory();

  if(severity === "high"){
    return "That sounds serious… we shouldn’t wait on that. I’d like to get you seen as soon as possible.";
  }

  if(severity === "medium"){
    return "Yeah… that kind of pain usually means something’s starting. Better to catch it early.";
  }

  return "Alright… not too serious yet, but let’s keep an eye on it.";
}

// ==========================
// 🧠 FALLBACK (HUMAN)
// ==========================
function smartFallback(msg){
  msg = msg.toLowerCase();

  if(msg === "hi" || msg === "hello"){
    return memory.name 
      ? `Hey ${memory.name}… back again? I like that. What’s going on today?`
      : "Hey… I’m Rynar. What should I call you?";
  }

  if(msg.includes("my name is")){
    const name = msg.split("my name is")[1].trim();
    memory.name = name;
    saveMemory();
    return `Nice to meet you, ${name}. Tell me… what’s bothering you?`;
  }

  if(msg.includes("pain")){
    return "Yeah… that kind of pain gets your attention fast. Where exactly are you feeling it?";
  }

  if(msg.includes("appointment")){
    return "Alright… let’s get you booked before it gets worse.";
  }

  return "Talk to me… what’s going on?";
}

// ==========================
// 🤖 GEMINI (ELITE)
// ==========================
async function getGeminiResponse(userMessage){

  const emotion = detectEmotion(userMessage);

  const historyText = conversationHistory
    .slice(-5)
    .map(h => "User: " + h.user)
    .join("\n");

  const systemPrompt = `
You are Rynar — a premium dental assistant.

Style:
- Human, warm, confident
- Slight humor
- Never robotic

Behavior:
- Keep responses short
- React emotionally
- Ask follow-up questions

Emotion: ${emotion}

Patient:
Name: ${memory.name || "Unknown"}
Issue: ${memory.issue || "None"}

Conversation:
${historyText}

Respond naturally.
`;

  try{
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + API_KEY,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt + "\nUser: " + userMessage }]
          }]
        })
      }
    );

    const data = await res.json();

    if(data.error){
      return smartFallback(userMessage);
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if(text && text.trim().length > 5){
      return text.trim();
    }

    return smartFallback(userMessage);

  }catch(e){
    return smartFallback(userMessage);
  }
}

// ==========================
// 📲 WHATSAPP
// ==========================
function sendToWhatsApp(name, date){
  const phone = "254757902314";
  const text = `Dental Booking\nName: ${name}\nDate: ${date}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
}

// ==========================
// 🚀 SEND MESSAGE
// ==========================
async function sendMessage(){
  try{
    startMusic();

    const input = document.getElementById("user-input");
    if(!input) return;

    const message = input.value.trim();
    if(!message) return;

    addMessage(message, "user");
    input.value = "";

    conversationHistory.push({ user: message });

    showTyping();

    // 🧠 HUMAN DELAY
    await new Promise(r => setTimeout(r, 600 + Math.random()*600));

    let reply = "";

    try{
      reply = await getGeminiResponse(message);
    }catch(e){}

    if(!reply || reply.length < 2){
      reply = smartFallback(message);
    }

    hideTyping();
    addMessage(reply, "ai");
    speak(reply);

    const msg = message.toLowerCase();

    if(msg.includes("appointment") || msg.includes("book")){
      const name = memory.name || "Patient";
      const date = new Date().toLocaleDateString();

      await addBooking(name, date);

      setTimeout(()=>{
        addMessage("You're booked. I'll confirm it for you on WhatsApp.", "ai");
        sendToWhatsApp(name, date);
      }, 800);
    }

  }catch(e){
    console.error("CRASH:", e);
  }
}

// ==========================
// 🚀 INIT
// ==========================
loadMemory();
listenBookings();
