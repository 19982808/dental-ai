// ==========================
// 🔐 CONFIG
// ==========================
const API_KEY = "AIzaSyDQLQnELoeNGQ08JuxF80wGiRoSIFcOhO4"; 
// ==========================
// 💾 BOOKINGS STORAGE
// ==========================
let bookings = JSON.parse(localStorage.getItem('bookings')) || [];

function saveBookings(){
  localStorage.setItem('bookings', JSON.stringify(bookings));
}

// ==========================
// 🧾 ADD BOOKING
// ==========================
function addBooking(name, date){
  bookings.push({ name, date });
  saveBookings();
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
    saveBookings();
    renderBookings();
  }
}

// ==========================
// 💬 CHAT SYSTEM
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
// 🔊 VOICE OUTPUT (DEEP MALE)
// ==========================
function speak(text){
  const speech = new SpeechSynthesisUtterance(text);

  speech.pitch = 0.5;   // deeper
  speech.rate = 0.85;   // slower
  speech.volume = 1;

  const voices = speechSynthesis.getVoices();
  speech.voice = voices.find(v => v.name.toLowerCase().includes("male")) || voices[0];

  speechSynthesis.speak(speech);
}

// ==========================
// 🧠 GEMINI AI (RYNAR)
// ==========================
async function getGeminiResponse(userMessage){

  const systemPrompt = `
You are Rynar — a confident, calm, masculine dental AI assistant.

Tone:
- Smooth, intelligent, slightly seductive
- Friendly and professional
- Slight humor when appropriate

Skills:
- Dentistry expert
- Customer care
- Booking assistant

Goal:
- Help users with dental problems
- Guide them professionally
- Encourage booking naturally
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=" + API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  return data?.candidates?.[0]?.content?.parts?.[0]?.text 
    || "I’m here… tell me more so I can help you properly.";
}

// ==========================
// 📲 WHATSAPP INTEGRATION
// ==========================
function sendToWhatsApp(name, date){
  const phone = "254757902314"; // your number

  const text = `Hello, I'd like to confirm my dental booking.\nName: ${name}\nDate: ${date}`;

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

  try {
    const reply = await getGeminiResponse(message);

    hideTyping();
    addMessage(reply, "ai");
    speak(reply);

    // 🔥 SMART BOOKING DETECTION
    if(message.toLowerCase().includes("book")){
      const name = "Patient";
      const date = new Date().toLocaleDateString();

      addBooking(name, date);

      setTimeout(()=>{
        addMessage("I've scheduled that for you. Want me to confirm it on WhatsApp? 😉", "ai");
      }, 800);

      setTimeout(()=>{
        sendToWhatsApp(name, date);
      }, 1500);
    }

  } catch (err) {
    hideTyping();

    addMessage("Hmm… something isn’t connecting right. Try again in a moment.", "ai");
    console.error(err);
  }
}
