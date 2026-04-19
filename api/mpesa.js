
// api/mpesa.js — Lipa na M-Pesa STK Push
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { phone, amount, accountRef = "RynarDental" } = req.body || {};

  if (!phone || !amount) {
    return res.status(400).json({ error: "phone and amount are required" });
  }

  const {
    MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE,
    MPESA_PASSKEY,
    MPESA_CALLBACK_URL,
  } = process.env;

  try {
    // ── 1. Get OAuth token ────────────────────────
    const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(500).json({ error: "Failed to get M-Pesa token" });

    // ── 2. Build password & timestamp ────────────
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");

    // ── 3. Format phone (must be 2547XXXXXXXX) ───
    const formattedPhone = phone.toString().replace(/^0/, "254").replace(/^\+/, "");

    // ── 4. STK Push request ───────────────────────
    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password:          password,
          Timestamp:         timestamp,
          TransactionType:   "CustomerPayBillOnline",
          Amount:            Math.ceil(amount),
          PartyA:            formattedPhone,
          PartyB:            MPESA_SHORTCODE,
          PhoneNumber:       formattedPhone,
          CallBackURL:       MPESA_CALLBACK_URL,
          AccountReference:  accountRef,
          TransactionDesc:   "Rynar Dental Payment",
        }),
      }
    );

    const stkData = await stkRes.json();
    if (!stkRes.ok || stkData.ResponseCode !== "0") {
      console.error("STK Push error:", stkData);
      return res.status(400).json({ error: stkData.errorMessage || "STK Push failed", detail: stkData });
    }

    return res.status(200).json({
      success: true,
      checkoutRequestId: stkData.CheckoutRequestID,
      message: "STK Push sent — check your phone and enter your M-Pesa PIN",
    });

  } catch (err) {
    console.error("M-Pesa handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
