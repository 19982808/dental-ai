// ========================
// 🧠 GLOBAL STATE
// ========================
let chatHistory = [];
let userProfile = {
  name: "",
  symptoms: []
};
async function askAI(message) {
  try {
    // Save message
    chatHistory.push({ role: "user", content: message });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `
You are an elite dental AI assistant.

Rules:
- Be specific, not generic
- Ask follow-up questions if needed
- Adjust advice based on symptoms
- Sound human, confident, and helpful
`
          },
          ...chatHistory
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "API error");
    }

    const reply = data.reply;

    // Save AI response
    chatHistory.push({ role: "assistant", content: reply });

    return reply;

  } catch (err) {
    return "⚠️ Something went wrong. Try again.";
  }
}
async function handleSend() {
  const input = document.getElementById("chatInput");
  const message = input.value;

  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  const reply = await askAI(message);
  addMessage(reply, "ai");
}
