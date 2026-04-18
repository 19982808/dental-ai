export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { phone, amount } = req.body;

    // ✅ Format phone to 2547XXXXXXXX
    let formattedPhone = phone.replace(/^0/, "254");

    // =============================
    // 1. GET ACCESS TOKEN
    // =============================
    const auth = Buffer.from(
      process.env.MPESA_CONSUMER_KEY + ":" + process.env.MPESA_CONSUMER_SECRET
    ).toString("base64");

    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // =============================
    // 2. GENERATE TIMESTAMP
    // =============================
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    // =============================
    // 3. GENERATE PASSWORD
    // =============================
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE +
      process.env.MPESA_PASSKEY +
      timestamp
    ).toString("base64");

    // =============================
    // 4. STK PUSH REQUEST
    // =============================
    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: formattedPhone,
          CallBackURL: process.env.MPESA_CALLBACK_URL,
          AccountReference: "Rynar Dental",
          TransactionDesc: "Dental AI Payment"
        })
      }
    );

    const stkData = await stkRes.json();

    return res.status(200).json(stkData);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
