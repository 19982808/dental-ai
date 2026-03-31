const chatBody = document.getElementById("chat-body");

// USER NAME MEMORY
let userName = localStorage.getItem("userName");
if (!userName) {
  userName = prompt("Hey, what's your name?");
  localStorage.setItem("userName", userName);
}

// CHAT MEMORY
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

function saveChat() {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "chat-bubble";
  msg.innerText = `${sender}: ${text}`;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;

  chatHistory.push({ sender, text });
  saveChat();

  return msg;
}

// LOAD CHAT
chatHistory.forEach(msg => addMessage(msg.sender, msg.text));

// AUTO GREETING
if (!localStorage.getItem("welcomed")) {
  addMessage("AI", `Hey ${userName}… I’ve been expecting you 😏`);
  localStorage.setItem("welcomed", true);
}

// SEND MESSAGE
async function sendMessage() {
  const input = document.getElementById("chat-message");
  const message = input.value.trim();
  if (!message) return;

  const mode = document.getElementById("mode").value;

  addMessage("You", message);
  input.value = "";

  const typing = addMessage("AI", "Typing...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        message,
        userId: userName,
        name: userName,
        mode
      })
    });

    const data = await res.json();

    typeText(typing, data.reply);
    speak(data.reply);

    if (data.reply.toLowerCase().includes("book")) {
      setTimeout(bookNow, 1200);
    }

  } catch {
    typing.innerText = "⚠️ Error.";
  }
}

// TYPING EFFECT
function typeText(el, text) {
  let i = 0;
  el.innerText = "";
  const int = setInterval(() => {
    el.innerText += text[i++];
    if (i >= text.length) clearInterval(int);
  }, 15);
}

// VOICE OUTPUT
function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 0.85;
  speech.pitch = 0.7;
  speechSynthesis.speak(speech);
}

// VOICE INPUT
function startListening() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.start();
  recognition.onresult = e => {
    document.getElementById("chat-message").value = e.results[0][0].transcript;
    sendMessage();
  };
}

// MUSIC
function toggleMusic() {
  const music = document.getElementById("jazz");
  music.paused ? music.play() : music.pause();
}

// IMAGE UPLOAD
document.getElementById("imageInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.style.maxWidth = "200px";
    chatBody.appendChild(img);
  };
  reader.readAsDataURL(file);
});

// BOOKING → WHATSAPP
function bookNow() {
  const service = prompt("Service?");
  const date = prompt("Date?");

  if (!service || !date) return;

  let count = localStorage.getItem("bookings") || 0;
  localStorage.setItem("bookings", ++count);

  const msg = `Booking:\nName: ${userName}\nService: ${service}\nDate: ${date}`;
  window.open(`https://wa.me/254757902314?text=${encodeURIComponent(msg)}`);
}

// PAYMENT
async function payNow() {
  const phone = prompt("2547XXXXXXXX");
  const amount = prompt("Amount");

  if (!phone || !amount) return;

  addMessage("AI", "Processing payment...");

  try {
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ phone, amount })
    });

    const data = await res.json();
    addMessage("AI", data.message);

  } catch {
    addMessage("AI", "Payment failed");
  }
}
