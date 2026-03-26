const API_KEY = "AIzaSyD1iiLZqD6hhNGyovLuwBU7CFq6AGDsVIU";

const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");
const sendSound = document.getElementById("sendSound");

let bookingStep = 0;
let bookingData = {};

// ✅ ADD MESSAGE
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔊 TEXT TO SPEECH (Deep, smooth)
function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);

  const voices = speechSynthesis.getVoices();

  const preferredVoice = voices.find(v =>
    v.name.toLowerCase().includes("male") ||
    v.name.toLowerCase().includes("english") ||
    v.name.toLowerCase().includes("africa")
  );

  if (preferredVoice) speech.voice = preferredVoice;

  speech.pitch = 0.8;
  speech.rate = 0.9;

  speechSynthesis.cancel(); // stop overlapping voices
  speechSynthesis.speak(speech);
}

// 🎤 SPEECH TO TEXT
function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice input not supported on this device");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = function (event) {
    const text = event.results[0][0].transcript;
    document.getElementById("user-input").value = text;
    sendMessage();
  };

  recognition.start();
}

// 🚀 MAIN FUNCTION
async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();

  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  // 🔊 SOUND
  if (sendSound) sendSound.play();

  // 🟡 BOOKING FLOW
  if (bookingStep === 1) {
    bookingData.name = message;
    bookingStep = 2;

    const reply = "Great, what date would you like to book?";
    addMessage(reply, "ai");
    speak(reply);
    return;
  }

  if (bookingStep === 2) {
    bookingData.date = message;
    bookingStep = 0;

    localStorage.setItem("booking", JSON.stringify(bookingData));

    const confirmation = `Booking confirmed. Name: ${bookingData.name}. Date: ${bookingData.date}`;
    addMessage(confirmation, "ai");
    speak(confirmation);

    bookingData = {};
    return;
  }

  if (message.toLowerCase().includes("book")) {
    bookingStep = 1;

    const reply = "Sure, what's your name?";
    addMessage(reply, "ai");
    speak(reply);
    return;
  }

  // ✨ SHOW TYPING DOTS
  if (typingIndicator) typingIndicator.classList.remove("hidden");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an elite dental clinic AI receptionist.
You are calm, confident, slightly deep-toned and premium.

You help patients:
- Understand dental issues
- Suggest treatments
- Encourage bookings naturally

Keep responses short, smooth and professional.

Patient: ${message}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("API RESPONSE:", data);

    // ❌ HIDE TYPING
    if (typingIndicator) typingIndicator.classList.add("hidden");

    // ✅ SAFE PARSING
    let reply = "Sorry, something went wrong. Please try again.";

    if (
      data &&
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0 &&
      data.candidates[0].content.parts[0].text
    ) {
      reply = data.candidates[0].content.parts[0].text;
    }

    addMessage(reply, "ai");
    speak(reply);

  } catch (error) {
    console.error("ERROR:", error);

    if (typingIndicator) typingIndicator.classList.add("hidden");

    const errMsg = "Network error. Please check your connection.";
    addMessage(errMsg, "ai");
    speak(errMsg);
  }
}
