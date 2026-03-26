const API_KEY = "AIzaSyD1iiLZqD6hhNGyovLuwBU7CFq6AGDsVIU";

const chatBox = document.getElementById("chat-box");

let bookingStep = 0;
let bookingData = {};

// Add message to UI
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔊 TEXT TO SPEECH (Deep smooth voice)
function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);

  const voices = speechSynthesis.getVoices();

  const preferredVoice = voices.find(v =>
    v.name.toLowerCase().includes("male") ||
    v.name.toLowerCase().includes("africa") ||
    v.name.toLowerCase().includes("english")
  );

  if (preferredVoice) speech.voice = preferredVoice;

  speech.pitch = 0.8; // deeper
  speech.rate = 0.9;  // smoother

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

// MAIN FUNCTION
async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();

  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  // 🟡 BOOKING FLOW
  if (bookingStep === 1) {
    bookingData.name = message;
    bookingStep = 2;
    addMessage("Great, what date would you like to book?", "ai");
    speak("Great, what date would you like to book?");
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
    addMessage("Sure, what's your name?", "ai");
    speak("Sure, what's your name?");
    return;
  }

  // Typing indicator
  addMessage("Typing...", "ai");

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
You are calm, confident, and slightly deep-toned in personality.

You help patients:
- Understand dental problems
- Encourage bookings
- Explain treatments simply

Keep responses short and natural.

Patient: ${message}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("API RESPONSE:", data);

    // Remove typing
    chatBox.lastChild.remove();

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

    // Remove typing
    chatBox.lastChild.remove();

    const errMsg = "Network error. Please check your connection.";
    addMessage(errMsg, "ai");
    speak(errMsg);
  }
}
