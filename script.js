const API_KEY = "YOUR_NEW_API_KEY_HERE";

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

// Main function
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
    return;
  }

  if (bookingStep === 2) {
    bookingData.date = message;
    bookingStep = 0;

    // Save booking locally
    localStorage.setItem("booking", JSON.stringify(bookingData));

    addMessage(
      `✅ Booking confirmed!\nName: ${bookingData.name}\nDate: ${bookingData.date}`,
      "ai"
    );

    bookingData = {};
    return;
  }

  // If user wants to book
  if (message.toLowerCase().includes("book")) {
    bookingStep = 1;
    addMessage("Sure! What's your name?", "ai");
    return;
  }

  // Show typing
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
Be professional, friendly, and short.

Encourage patients to book appointments.

Patient: ${message}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("API:", data);

    // Remove typing
    chatBox.lastChild.remove();

    // Safe parsing
    let reply = "Sorry, I couldn't understand that.";

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

  } catch (error) {
    console.error(error);
    chatBox.lastChild.remove();
    addMessage("Network error. Please try again.", "ai");
  }
}
