// ==========================
// 🔐 CONFIG
// ==========================
const API_KEY = "AIzaSyDQLQnELoeNGQ08JuxF80wGiRoSIFcOhO4"; 
// ==========================
// 💾 STORAGE
// ==========================
let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
let memory = JSON.parse(localStorage.getItem('memory')) || {
  name: null,
  issue: null,
  painLevel: null
};

function saveData(){
  localStorage.setItem('bookings', JSON.stringify(bookings));
  localStorage.setItem('memory', JSON.stringify(memory));
}

// ==========================
// 🧾 BOOKING SYSTEM
// ==========================
function addBooking(name, date){
  bookings.push({ name, date });
  saveData();
}

// ==========================
// 📊 ADMIN DASHBOARD
// ==========================
function toggleAdmin(){
  const chat = document.getElementById('chatView');
  const admin = document.getElementById('adminView');

  if(admin.style.display === 'none'){
    chat.style.display = 'none';
    admin.style.display = 'block';
    renderBookings();
  } else {
    admin.style.display = 'none';
    chat.style.display = 'block';
  }
}

function renderBookings(){
  const body = document.getElementById('bookingBody');
  const empty = document.getElementById('emptyMsg');

  body.innerHTML = '';

  if(bookings.length === 0){
    empty.style.display = 'block';
    return;
  } else {
    empty.style.display = 'none';
  }

  bookings.forEach((b,i)=>{
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i+1}</td>
      <td>${b.name}</td>
      <td>${b.date}</td>
      <td><button onclick="deleteBooking(${i})">Delete</button></td>
    `;
    body.appendChild(row);
  });
}

function deleteBooking(i){
  if(confirm('Delete booking?')){
    bookings.splice(i,1);
    saveData();
    renderBookings();
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
// 🎤 VOICE INPUT
// ==========================
function startListening(){
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";

  recognition.onresult = function(event){
    document.getElementById("user-input").value = event.results[0][0].transcript;
    sendMessage();
  };

  recognition.start();
}

// ==========================
// 🔊 VOICE OUTPUT
// ==========================
function speak(text){
  const speech = new SpeechSynthesisUtterance(text);

  speech.pitch = 0.5;
  speech.rate = 0.85;

  const voices = speechSynthesis.getVoices();
  speech.voice = voices.find(v => v.name.toLowerCase().includes("male")) || voices[0];

  speechSynthesis.speak(speech);
}

// ==========================
// 🧠 SMART TRIAGE SYSTEM
// ==========================
function analyzeSymptoms(msg){
  msg = msg.toLowerCase();

  let severity = "low";

  if(msg.includes("severe") || msg.includes("unbearable") || msg.includes("swelling")){
    severity = "high";
  } else if(msg.includes("pain") || msg.includes("ache")){
    severity = "medium";
  }

  memory.issue = msg;
  memory.painLevel = severity;
  saveData();

  if(severity === "high"){
    return "That sounds serious. You might have an infection or abscess. I strongly recommend urgent dental care.";
  }

  if(severity === "medium"){
    return "That discomfort could be decay or sensitivity. It’s best to treat it early before it worsens.";
  }

  return "Alright… doesn’t sound too severe, but let’s keep an eye on it.";
}

// ==========================
// 🧠 FALLBACK AI
// ==========================
function smartFallback(msg){
  msg = msg.toLowerCase();

  if(msg.includes("hi") || msg.includes("hello")){
    return memory.name 
      ? `Hey ${memory.name}… good to have you back. What’s going on today?`
      : "Hey… I’m Rynar. What’s your name?";
  }

  if(!memory.name){
    memory.name = msg;
    saveData();
    return `Nice to meet you, ${memory.name}. Now tell me… what’s bothering you?`;
  }

  if(msg.includes("tooth") || msg.includes("pain") || msg.includes("ache")){
    return analyzeSymptoms(msg);
  }

  if(msg.includes("book") || msg.includes("appointment")){
    return "Let’s lock that in for you. I’ll take care of it.";
  }

  return "Tell me more… I want to understand properly before I guide you.";
}

// ==========================
// 🤖 GEMINI AI
// ==========================
async function getGeminiResponse(userMessage){

  const systemPrompt = `
You are Rynar, an elite dental AI assistant.

User memory:
Name: ${memory.name || "Unknown"}
Issue: ${memory.issue || "None"}
Pain Level: ${memory.painLevel || "Unknown"}

Personality:
- Confident, calm, masculine
- Professional,sexy and very charming
- Human-like responses

Behavior:
- Give real dental advice
- Ask follow-up questions
- Be concise but helpful
`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + API_KEY,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt + "\nUser: " + userMessage
            }]
          }]
        })
      }
    );

    const data = await response.json();

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if(aiText) return aiText;

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

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
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

  // SMART BOOKING
  const msg = message.toLowerCase();

  if(
    msg.includes("book appointment") ||
    msg.includes("schedule") ||
    msg.includes("appointment")
  ){
    const name = memory.name || "Patient";
    const date = new Date().toLocaleDateString();

    addBooking(name, date);

    setTimeout(()=>{
      addMessage("You're booked. I’ll send confirmation on WhatsApp now.", "ai");
      sendToWhatsApp(name, date);
    }, 800);
  }
}
