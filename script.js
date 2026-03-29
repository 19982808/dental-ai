// ==========================
// 🔐 CONFIG
// ==========================
const API_KEY = "AIzaSyCv9vt4fIty-hNuqmOPGV1E2Kl5ON9HOqA"; 
// ==========================
// 🔥 FIREBASE CONFIG
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
} catch (e) {
  console.warn("Firebase not available:", e);
}

// ==========================
// 🧠 USER MEMORY
// ==========================
let memory = {
  name: null,
  issue: null,
  painLevel: null
};

const USER_ID = localStorage.getItem("ryn_user") || "user_" + Date.now();
localStorage.setItem("ryn_user", USER_ID);

// LOAD MEMORY
async function loadMemory(){
  try {
    if(!db) return;

    const doc = await db.collection("patients").doc(USER_ID).get();
    if(doc.exists){
      memory = doc.data();
    }
  } catch(e){
    console.warn("Memory load failed");
  }
}

// SAVE MEMORY
async function saveMemory(){
  try {
    if(!db) return;
    await db.collection("patients").doc(USER_ID).set(memory);
  } catch(e){
    console.warn("Memory save failed");
  }
}

// ==========================
// 📊 BOOKINGS
// ==========================
async function addBooking(name, date){
  try {
    if(!db) return;

    await db.collection("bookings").add({
      name,
      date,
      userId: USER_ID,
      timestamp: new Date()
    });
  } catch(e){
    console.warn("Booking failed");
  }
}

// SAFE LISTENER
function listenBookings(){
  try {
    if(!db) return;

    const body = document.getElementById('bookingBody');
    const empty = document.getElementById('emptyMsg');

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

  } catch(e){
    console.warn("Booking listener failed");
  }
}

// ==========================
// 💬 CHAT UI
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
// 🔊 VOICE
// ==========================
function speak(text){
  try {
    const speech = new SpeechSynthesisUtterance(text);
    speech.pitch = 0.6;
    speech.rate = 0.85;

    const voices = speechSynthesis.getVoices();
    speech.voice = voices.find(v =>
      v.name.toLowerCase().includes("male")
    ) || voices[0];

    speechSynthesis.speak(speech);
  } catch(e){}
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
    return "That sounds serious… possible infection. You need urgent dental care.";
  }

  if(severity === "medium"){
    return "That pain could mean decay or nerve irritation. We should check it early.";
  }

  return "Alright… not severe, but let’s monitor it.";
}

// ==========================
// 🧠 FALLBACK (SMART BRAIN)
// ==========================
function smartFallback(msg){
  msg = msg.toLowerCase();

  if(msg === "hi" || msg === "hello"){
    return memory.name 
      ? `Hey ${memory.name}… good to see you again.`
      : "Hey… I’m Rynar. What’s your name?";
  }

  if(msg.includes("my name is")){
    const name = msg.split("my name is")[1].trim();
    memory.name = name;
    saveMemory();
    return `Nice to meet you, ${name}. What’s bothering you?`;
  }

  if(msg.includes("pain") || msg.includes("tooth")){
    return analyzeSymptoms(msg);
  }

  if(msg.includes("appointment") || msg.includes("book")){
    return "Let’s secure your booking. I’ve got you.";
  }

  return "Tell me more… I want to help properly.";
}

// ==========================
// 🤖 GEMINI AI (SAFE)
// ==========================
async function getGeminiResponse(userMessage){

  const systemPrompt = `
You are Rynar, a high-end dental AI assistant.

Patient:
Name: ${memory.name || "Unknown"}
Issue: ${memory.issue || "None"}
Pain Level: ${memory.painLevel || "Unknown"}

Tone:
- Confident
- Calm
- Professional

Give useful dental guidance and ask follow-ups.
`;

  try {
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
      console.error("API ERROR:", data.error);
      return smartFallback(userMessage);
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if(text && text.trim().length > 5){
      return text.trim();
    }

    return smartFallback(userMessage);

  } catch (err) {
    console.error("Gemini failed:", err);
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
// 🚀 SEND MESSAGE (BULLETPROOF)
// ==========================
async function sendMessage(){
  try {
    const input = document.getElementById("user-input");

    if(!input){
      alert("Input box missing");
      return;
    }

    const message = input.value.trim();
    if(!message) return;

    addMessage(message, "user");
    input.value = "";

    showTyping();

    let reply = "";

    try {
      reply = await getGeminiResponse(message);
    } catch (err) {
      console.error("AI error:", err);
    }

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
        addMessage("You're booked. Confirming via WhatsApp now.", "ai");
        sendToWhatsApp(name, date);
      }, 800);
    }

  } catch (err) {
    console.error("SEND CRASH:", err);
    alert("App crashed — check console.");
  }
}

// ==========================
// 🚀 INIT
// ==========================
loadMemory();
listenBookings();
