const chatBox = document.getElementById("chat-box");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();

  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  // Temporary fake AI (we'll connect real AI next)
  let reply = getDentalReply(message);

  addMessage(reply, "ai");
}

function getDentalReply(msg) {
  msg = msg.toLowerCase();

  if (msg.includes("pain")) {
    return "You may need a dental checkup. This could be a cavity or infection.";
  } 
  else if (msg.includes("price")) {
    return "Consultation is around KES 1,000–2,000 depending on the clinic.";
  } 
  else if (msg.includes("book")) {
    return "Sure! Please provide your name and preferred date.";
  } 
  else {
    return "Can you describe your dental issue in more detail?";
  }
}
