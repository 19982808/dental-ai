// ===============================
// ELEMENTS
// ===============================
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const typing = document.getElementById("typing-indicator");

const jazzBtn = document.getElementById("jazzBtn");
const voiceBtn = document.getElementById("voiceBtn");
const adminBtn = document.getElementById("adminBtn");

const adminView = document.getElementById("adminView");
const chatView = document.getElementById("chatView");

// ===============================
// EVENTS
// ===============================
sendBtn.onclick = sendMessage;

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

adminBtn.onclick = toggleAdmin;

// ===============================
// CHAT UI
// ===============================
function addMessage(text, sender="bot"){
  const div = document.createElement("div");
  div.className = sender;

  if(text.includes("[IMAGE:")){
    const parts = text.split("[IMAGE:");
    div.innerText = parts[0];

    const img = document.createElement("img");
    img.src = `https://source.unsplash.com/400x300/?${parts[1].replace("]","")}`;
    img.style.width="100%";
    img.style.marginTop="10px";
    img.style.borderRadius="10px";

    div.appendChild(img);
  } else {
    div.innerText = text;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===============================
// TYPING EFFECT
// ===============================
function showTyping(){
  typing.classList.remove("hidden");
}
function hideTyping(){
  typing.classList.add("hidden");
}

// ===============================
// PERSONALITY
// ===============================
function vibe(text){
  const extras = [
    "I’ve got you.",
    "Relax, we’ll fix it.",
    "You’re good.",
    "Nothing serious yet."
  ];
  return text + "\n\n" + extras[Math.floor(Math.random()*extras.length)];
}

// ===============================
// DENTAL AI
// ===============================
let memory = {};

function brain(input){
  input = input.toLowerCase();

  if(input.includes("cold")){
    return vibe("Sounds like sensitivity.\n\nIs it sharp or lingering?");
  }

  if(input.includes("throbbing")){
    return vibe("That might be nerve pain.\n\nRoot canal may be needed.\n\n[IMAGE: root canal]");
  }

  if(input.includes("cavity") || input.includes("hole")){
    return vibe("That’s a cavity.\n\nA filling will fix it.\n\n[IMAGE: dental filling]");
  }

  if(input.includes("gum")){
    return vibe("That could be gum inflammation.\n\nDo they bleed?");
  }

  return null;
}

// ===============================
// RESPONSE ENGINE
// ===============================
function respond(inputText){
  const txt = inputText.toLowerCase();

  if(["hi","hello","hey"].includes(txt)){
    return vibe("Hey… what’s going on?");
  }

  if(txt.includes("pain") || txt.includes("tooth")){
    return vibe("Tell me what it feels like.");
  }

  if(txt.includes("filling")){
    return vibe("Fillings fix cavities.\n\n[IMAGE: dental filling]");
  }

  if(txt.includes("root canal")){
    return vibe("Root canal removes infection.\n\n[IMAGE: root canal]");
  }

  const smart = brain(txt);
  if(smart) return smart;

  return vibe("Explain it better so I don’t guess.");
}

// ===============================
// SEND MESSAGE
// ===============================
function sendMessage(){
  const text = input.value.trim();
  if(!text) return;

  addMessage(text,"user");
  input.value="";

  showTyping();

  setTimeout(()=>{
    hideTyping();
    addMessage(respond(text),"bot");
  },600);
}

// ===============================
// ADMIN
// ===============================
function toggleAdmin(){
  if(adminView.style.display==="none"){
    adminView.style.display="block";
    chatView.style.display="none";
  } else {
    adminView.style.display="none";
    chatView.style.display="block";
  }
}

// ===============================
// VOICE (basic placeholder)
// ===============================
let voiceOn = true;
voiceBtn.onclick = ()=>{
  voiceOn = !voiceOn;
  voiceBtn.innerText = voiceOn ? "🔊" : "🔇";
};

// ===============================
// JAZZ (background audio)
// ===============================
let jazzPlaying = false;
let jazzAudio = new Audio("https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3");

jazzBtn.onclick = ()=>{
  jazzPlaying = !jazzPlaying;
  if(jazzPlaying){
    jazzAudio.loop = true;
    jazzAudio.play();
  } else {
    jazzAudio.pause();
  }
};

// ===============================
// IMAGE UPLOAD
// ===============================
function handleImageUpload(e){
  const file = e.target.files[0];
  if(!file) return;

  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.src = url;
  img.style.width="100%";

  chatBox.appendChild(img);
}

// ===============================
// START
// ===============================
window.onload = ()=>{
  addMessage("Hey… talk to me. What’s going on?","bot");
};
