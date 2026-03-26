const API_KEY = "AIzaSyDQLQnELoeNGQ08JuxF80wGiRoSIFcOhO4"; 
const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");
const sendSound = document.getElementById("sendSound");

let bookingStep = 0;
let bookingData = {};

// ADD MESSAGE
function addMessage(text, sender){
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// DEEP MASCULINE VOICE
function speak(text){
  const speech = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(v=>v.name.includes("Google UK English Male")) 
      || voices.find(v=>v.name.toLowerCase().includes("male")) 
      || voices[0];
  speech.voice = preferredVoice;
  speech.pitch = 0.55;  // extra deep
  speech.rate = 0.85;
  speech.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(speech);
}

// SPEECH TO TEXT
function startListening(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ alert("Voice input not supported"); return; }
  const recognition = new SpeechRecognition();
  recognition.lang="en-US";
  recognition.onresult = function(event){
    const text = event.results[0][0].transcript;
    document.getElementById("user-input").value = text;
    sendMessage();
  };
  recognition.start();
}

// MAIN SEND FUNCTION
async function sendMessage(){
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if(!message) return;

  addMessage(message, "user");
  input.value="";
  if(sendSound) sendSound.play();

  // BOOKING FLOW
  if(bookingStep===1){
    bookingData.name = message;
    bookingStep=2;
    const reply="Great! What date would you like to book?";
    addMessage(reply,"ai"); speak(reply);
    return;
  }
  if(bookingStep===2){
    bookingData.date=message;
    bookingStep=0;
    // STORE BOOKINGS
    let bookings = JSON.parse(localStorage.getItem("bookings")) || [];
    bookings.push(bookingData);
    localStorage.setItem("bookings",JSON.stringify(bookings));

    const confirmation = `Booking confirmed! Name: ${bookingData.name}, Date: ${bookingData.date}`;
    addMessage(confirmation,"ai"); speak(confirmation);

    // WHATSAPP LEAD
    const phoneNumber = "254757902314"; // your number
    const whatsappMsg=`Hello, I want to confirm my dental booking. Name: ${bookingData.name}, Date: ${bookingData.date}`;
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(whatsappURL,"_blank");

    bookingData={};
    return;
  }
  if(message.toLowerCase().includes("book")){
    bookingStep=1;
    const reply="Sure! What's your name?";
    addMessage(reply,"ai"); speak(reply);
    return;
  }

  // TYPING DOTS
  if(typingIndicator) typingIndicator.classList.remove("hidden");

  try{
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          contents:[{
            parts:[{
              text:`You are an expert dental AI assistant. Be friendly, slightly humorous, professional, and knowledgeable about teeth, dental hygiene, and procedures. Greet the user, provide realistic advice, and encourage bookings. Patient: ${message}`
            }]
          }]
        })
      }
    );
    const data = await response.json();

    if(typingIndicator) typingIndicator.classList.add("hidden");

    let reply="Sorry, something went wrong. Please try again.";
    if(data && data.candidates && data.candidates[0]?.content?.parts[0]?.text){
      reply = data.candidates[0].content.parts[0].text;
    }
    addMessage(reply,"ai");
    speak(reply);

  } catch(e){
    console.error(e);
    if(typingIndicator) typingIndicator.classList.add("hidden");
    const errMsg="Network error. Please check your connection.";
    addMessage(errMsg,"ai");
    speak(errMsg);
  }
}
// BOOKINGS STORAGE
let bookings = JSON.parse(localStorage.getItem('bookings')) || [];

// TOGGLE ADMIN
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

// RENDER BOOKINGS
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

// DELETE
function deleteBooking(i){
  if(confirm('Delete booking?')){
    bookings.splice(i,1);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    renderBookings();
  }
}

// ADD BOOKING (CALL THIS FROM AI)
function addBooking(name, date){
  bookings.push({name, date});
  localStorage.setItem('bookings', JSON.stringify(bookings));
}
