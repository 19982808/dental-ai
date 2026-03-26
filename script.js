// ==========================
// 🔐 CONFIG
// ==========================
const API_KEY = "AIzaSyDQLQnELoeNGQ08JuxF80wGiRoSIFcOhO4"; 

// 🔥 FIREBASE CONFIG (PASTE YOURS HERE)
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

// ==========================
// 🔥 INIT FIREBASE
// ==========================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================
// 🧠 USER MEMORY (CLOUD)
// ==========================
let memory = {
  name: null,
  issue: null,
  painLevel: null
};

const USER_ID = localStorage.getItem("ryn_user") || "user_" + Date.now();
localStorage.setItem("ryn_user", USER_ID);

// LOAD MEMORY FROM FIREBASE
async function loadMemory(){
  const doc = await db.collection("patients").doc(USER_ID).get();
  if(doc.exists){
    memory = doc.data();
  }
}

// SAVE MEMORY
async function saveMemory(){
  await db.collection("patients").doc(USER_ID).set(memory);
}

// ==========================
// 📊 BOOKINGS (CLOUD)
// ==========================
async function addBooking(name, date){
  await db.collection("bookings").add({
    name,
    date,
    userId: USER_ID,
    timestamp: new Date()
  });
}

// REAL-TIME BOOKINGS (ADMIN)
function listenBookings(){
  const body = document.getElementById('bookingBody');
  const empty = document.getElementById('emptyMsg');

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
}

// DELETE BOOKING
async function deleteBooking(id){
  if(confirm("Delete booking?")){
    await db.collection("bookings").doc(id).delete();
  }
}

// ==========================
// 💬 CHAT UI
// ==========================
function addMessage(text, sender){
  const chat = document.getElementById("chat-box");
  const div = document.createElement("div");

  div.className = "message " + sender;
  div.innerText = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping(){
  document.getElementById("typing-indicator").classList.remove("hidden");
}

function hideTyping(){
  document.getElementById("typing-indicator").classList.add("hidden");
}

// ==========================
// 🔊 VOICE (DEEP MALE)
// ==========================
function speak(text){
  const speech = new SpeechSynthesisUtterance(text);

  speech.pitch = 0.6;
  speech.rate = 0.85;

  const voices = speechSynthesis.getVoices();
  speech.voice = voices.find(v =>
    v.name.toLowerCase().includes("male")
  ) || voices[0];

  speechSynthesis.speak(speech);
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
// 🧠 FALLBACK
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

  if(msg.includes("appointment")){
    return "Let’s secure your booking. I’ve got you.";
  }

  return "Tell me more… I want to help properly.";
}

// ==========================
// 🤖 GEMINI AI
// ==========================
async function getGeminiResponse(userMessage){

  const systemPrompt = `
You are Rynar, an elite dental AI assistant.

Patient:
Name: ${memory.name || "Unknown"}
Issue: ${memory.issue || "None"}
Pain Level: ${memory.painLevel || "Unknown"}

Tone:
- Confident
- Calm
- Masculine deep
- Charming,sexy but professional

Behavior:
- Give real dental advice
- Ask follow-up questions
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
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if(text && text.trim().length > 5){
      return text.trim();
    }

    return smartFallback(userMessage);

  } catch (err) {
    console.error(err);
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
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if(!message) return;

  addMessage(message, "user");
  input.value = "";

  showTyping();

  const reply = await getGeminiResponse(message);

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
}

// ==========================
// 🚀 INIT
// ==========================
loadMemory();
listenBookings();
