const API_KEY = "PASTE_YOUR_API_KEY_HERE";

async function sendMessage() {
  let input = document.getElementById("user-input");
  let message = input.value.trim();
  let chat = document.getElementById("chat-box");

  if (!message) return;

  chat.innerHTML += `<p><b>You:</b> ${message}</p>`;
  input.value = "";

  try {
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a professional dental clinic receptionist.
You help patients with:
- booking appointments
- explaining treatments
- giving friendly advice

Be polite, short, and helpful.

Patient: ${message}`
            }]
          }]
        })
      }
    );

    let data = await response.json();

    let reply = data.candidates[0].content.parts[0].text;

    chat.innerHTML += `<p><b>AI:</b> ${reply}</p>`;

  } catch (error) {
    chat.innerHTML += `<p><b>AI:</b> Sorry, something went wrong.</p>`;
  }
}
