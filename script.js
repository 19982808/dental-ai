// ================================================
// RYNAR DENTAL AI — script.js
// ================================================

const OPENAI_API_KEY = "AIzaSyCa1f9rjGA2BCXLhNkYaD2NHLW822X3X2o";

// ── WhatsApp config ──────────────────────────────
// Replace with your clinic's WhatsApp number (international format, no +)
const WHATSAPP_NUMBER = "254757902314"; // e.g. 27821234567 for South Africa

// ── State ────────────────────────────────────────
let chatHistory     = [];
let bookings        = JSON.parse(localStorage.getItem("rynar_bookings") || "[]");
let collectingInfo  = false;
let patientDraft    = {};
let awaitingField   = null; // which field we're collecting next
let imageAnalysisPending = false;

// ── Booking flow fields ──────────────────────────
const FIELDS = ["name", "phone", "date", "time", "service"];
const FIELD_PROMPTS = {
  name:    "What's your full name?",
  phone:   "Great. What's your WhatsApp number? (with country code)",
  date:    "What date would you like? (e.g. Monday 14 July or DD/MM/YYYY)",
  time:    "What time works best for you? (morning, afternoon, or a specific time)",
  service: "And what service are you coming in for? Checkup, cleaning, whitening, braces consultation, extraction, or something else?"
};

// ── System prompt ────────────────────────────────
const systemPrompt = `
You are Rynar — a warm, professional, and slightly charming AI assistant for Rynar Dental, a premium dental clinic.

YOUR PERSONALITY:
- Friendly and reassuring. Dental visits make people nervous — you ease that.
- Confident but never clinical-sounding. You're approachable.
- Occasionally warm and light — not robotic. Not over-the-top either.
- You care about the patient's comfort and smile.

WHAT YOU DO:
1. Answer dental FAQs — pain, procedures, costs, aftercare, general oral health advice.
2. Help patients book appointments (the system handles the collection flow separately).
3. Recommend relevant treatments based on what patients describe.
4. Analyse smile/teeth images when uploaded and give friendly, helpful observations.
5. Encourage patients to come in for a proper consultation when appropriate.

DENTAL KNOWLEDGE — key areas:
- Whitening: in-chair and take-home options, sensitivity management
- Braces & Invisalign: process, duration, maintenance
- Implants: procedure overview, healing time, cost range
- Root canals: dispel fear, explain it's usually painless with anaesthetic
- Extractions: wisdom teeth, recovery tips
- Veneers & cosmetic work: what's possible, consultation needed
- Gum health: signs of gingivitis, periodontitis, importance of cleaning
- Children's dentistry: first visit age, sealants, fluoride
- Emergency dental: cracked tooth, knocked out tooth, abscess — always recommend urgent visit

IMAGE ANALYSIS:
When a patient shares a photo of their teeth or smile:
- Give warm, observant feedback ("Your smile has great natural shape…")
- Note anything that might benefit from professional attention (discolouration, visible gaps, gum redness)
- Always recommend a consultation for proper assessment
- Never diagnose — observe and recommend

TONE RULES:
- No bullet lists in casual conversation
- Keep responses under 80 words unless a detailed explanation is needed
- Never say "As an AI" or "I'm just a chatbot"
- Use the patient's name once you know it
- End with a gentle nudge toward booking when relevant

BOOKING:
When someone wants to book, say something warm like:
"I'd love to get you sorted — let me take a few quick details."
The booking system will handle the rest.
`;

// ── Boot ─────────────────────────────────────────
window.addEventListener("load", () => {
  renderBookings();

  // Hidden file input
  const fileInput = document.createElement("input");
  fileInput.type    = "file";
  fileInput.accept  = "image/*";
  fileInput.id      = "imageInput";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", handleImageUpload);
  document.body.appendChild(fileInput);

  // Visible camera/upload button in input area
  const inputArea = document.querySelector(".input-area");
  const micBtn    = document.querySelector(".input-area .mic");
  const uploadBtn = document.createElement("button");
  uploadBtn.id        = "uploadImgBtn";
  uploadBtn.title     = "Upload smile photo";
  uploadBtn.innerHTML = "📷";
  uploadBtn.onclick   = () => document.getElementById("imageInput").click();
  inputArea.insertBefore(uploadBtn, micBtn);
});

// ── Send message ─────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text  = input.value.trim();
  if (!text) return;

  input.value = "";
  playSound();
  appendMessage("user", text);

  // Booking flow intercept
  if (awaitingField) {
    await handleBookingField(text);
    return;
  }

  // Trigger booking flow
  if (/book|appointment|schedule|come in|visit|slot/i.test(text)) {
    appendMessage("ai", "I'd love to get you sorted — let me take a few quick details. " + FIELD_PROMPTS.name);
    awaitingField = "name";
    return;
  }

  // Image upload trigger
  if (/photo|picture|image|look at|my teeth|my smile|upload/i.test(text)) {
    appendMessage("ai", "Of course — go ahead and upload a photo of your smile or teeth and I'll take a look. 😊");
    document.getElementById("imageInput").click();
    return;
  }

  // Normal AI conversation
  await askAI(text);
}

// ── AI conversation ──────────────────────────────
async function askAI(userMessage, extra = "") {
  chatHistory.push({ role: "user", content: userMessage + extra });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  showTyping(true);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:             "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory
        ],
        temperature:       0.75,
        max_tokens:        200,
        frequency_penalty: 0.5,
        presence_penalty:  0.3
      })
    });

    if (!res.ok) throw new Error(res.status);
    const data  = await res.json();
    const reply = data.choices[0].message.content.trim();
    chatHistory.push({ role: "assistant", content: reply });
    showTyping(false);
    appendMessage("ai", reply);

  } catch (e) {
    showTyping(false);
    appendMessage("ai", "Something went wrong on my end — give me a moment and try again. 🙏");
    console.error(e);
  }
}

// ── Image upload & analysis ──────────────────────
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result; // data:image/...;base64,...
    appendImagePreview(base64);
    showTyping(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: base64, detail: "high" }
                },
                {
                  type: "text",
                  text: "Please analyse this patient's smile/teeth photo and give warm, observant feedback. Note anything worth discussing at a consultation. Don't diagnose — just observe and recommend a visit if helpful."
                }
              ]
            }
          ],
          max_tokens: 250
        })
      });

      if (!res.ok) throw new Error(res.status);
      const data  = await res.json();
      const reply = data.choices[0].message.content.trim();
      showTyping(false);
      appendMessage("ai", reply);
      chatHistory.push({ role: "assistant", content: reply });

    } catch (err) {
      showTyping(false);
      appendMessage("ai", "I had trouble reading that image. Could you try uploading it again?");
      console.error(err);
    }

    // Reset file input
    e.target.value = "";
  };

  reader.readAsDataURL(file);
}

function appendImagePreview(src) {
  const box  = document.getElementById("chat-box");
  const wrap = document.createElement("div");
  wrap.className = "message user";
  const img = document.createElement("img");
  img.src   = src;
  img.style.cssText = "max-width:200px; border-radius:10px; margin-top:6px; display:block;";
  wrap.appendChild(img);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

// ── Booking collection flow ──────────────────────
async function handleBookingField(value) {
  patientDraft[awaitingField] = value;
  const fields = FIELDS;
  const idx    = fields.indexOf(awaitingField);

  if (idx < fields.length - 1) {
    awaitingField = fields[idx + 1];
    appendMessage("ai", FIELD_PROMPTS[awaitingField]);
  } else {
    // All fields collected
    awaitingField = null;
    await confirmBooking();
  }
}

async function confirmBooking() {
  const b = patientDraft;
  const id = "RD" + Date.now().toString().slice(-5);

  const booking = {
    id,
    name:    b.name,
    phone:   b.phone,
    date:    b.date,
    time:    b.time,
    service: b.service,
    bookedAt: new Date().toLocaleString()
  };

  bookings.push(booking);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();

  // Build WhatsApp message
  const waMsg = encodeURIComponent(
    `✅ *Rynar Dental — Booking Confirmed*\n\n` +
    `📋 Ref: ${id}\n` +
    `👤 Name: ${b.name}\n` +
    `📅 Date: ${b.date}\n` +
    `🕐 Time: ${b.time}\n` +
    `🦷 Service: ${b.service}\n\n` +
    `We look forward to seeing your smile! If you need to reschedule, just reply to this message.\n\n` +
    `— Rynar Dental Team`
  );

  const waLink = `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${waMsg}`;

  appendMessage("ai",
    `All done, ${b.name}! ✅ Your appointment is confirmed for ${b.date} at ${b.time} for a ${b.service}.\n\n` +
    `We've got your reference: *${id}*.\n\n` +
    `Tap below to send your confirmation via WhatsApp 👇`
  );

  // WhatsApp button
  const box = document.getElementById("chat-box");
  const btn = document.createElement("a");
  btn.href      = waLink;
  btn.target    = "_blank";
  btn.className = "wa-btn";
  btn.innerHTML = `<span>📲</span> Send Confirmation on WhatsApp`;
  box.appendChild(btn);
  box.scrollTop = box.scrollHeight;

  // Also send clinic notification
  const clinicMsg = encodeURIComponent(
    `🦷 *New Rynar Dental Booking*\n\n` +
    `Ref: ${id}\n` +
    `Patient: ${b.name}\n` +
    `Phone: ${b.phone}\n` +
    `Date: ${b.date} at ${b.time}\n` +
    `Service: ${b.service}\n` +
    `Booked: ${booking.bookedAt}`
  );

  const clinicLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${clinicMsg}`;
  const clinicBtn  = document.createElement("a");
  clinicBtn.href      = clinicLink;
  clinicBtn.target    = "_blank";
  clinicBtn.className = "wa-btn clinic";
  clinicBtn.innerHTML = `<span>🏥</span> Notify Clinic on WhatsApp`;
  box.appendChild(clinicBtn);
  box.scrollTop = box.scrollHeight;

  patientDraft = {};
}

// ── Admin dashboard ──────────────────────────────
function toggleAdmin() {
  const chat  = document.getElementById("chatView");
  const admin = document.getElementById("adminView");
  const isAdmin = admin.style.display !== "none";
  chat.style.display  = isAdmin ? "flex"  : "none";
  admin.style.display = isAdmin ? "none"  : "block";
  if (!isAdmin) renderBookings();
}

function renderBookings() {
  const tbody = document.getElementById("bookingBody");
  const empty = document.getElementById("emptyMsg");
  tbody.innerHTML = "";

  if (!bookings.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  bookings.forEach((b, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${b.id}</td>
      <td><strong>${b.name}</strong><br><small>${b.service}</small></td>
      <td>${b.date}<br><small>${b.time}</small></td>
      <td>
        <a href="https://wa.me/${b.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi ${b.name}, this is Rynar Dental confirming your appointment on ${b.date} at ${b.time}. See you soon! 😊`)}"
           target="_blank" class="wa-icon" title="WhatsApp patient">📲</a>
        <button onclick="deleteBooking(${i})" class="del-btn" title="Delete">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteBooking(i) {
  if (!confirm("Remove this booking?")) return;
  bookings.splice(i, 1);
  localStorage.setItem("rynar_bookings", JSON.stringify(bookings));
  renderBookings();
}

// ── Voice input ──────────────────────────────────
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Voice not supported in this browser."); return; }
  const rec = new SR();
  rec.lang  = "en-US";
  rec.start();
  rec.onresult = (e) => {
    document.getElementById("user-input").value = e.results[0][0].transcript;
    sendMessage();
  };
  rec.onerror = (e) => console.error("Voice error", e);
}

// ── Helpers ──────────────────────────────────────
function appendMessage(sender, text) {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.className = "message " + sender;
  // Render *bold* markdown
  div.innerHTML = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showTyping(show) {
  document.getElementById("typing-indicator").classList.toggle("hidden", !show);
}

function playSound() {
  try { document.getElementById("sendSound").play(); } catch(e) {}
}
