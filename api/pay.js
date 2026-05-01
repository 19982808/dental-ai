export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, phone, amount } = req.body;

    // ✅ Validate
    if (!name || !email || !amount) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    /* =========================
       1. GET AUTH TOKEN
    ========================= */
    let token;

    try {
      const authResponse = await fetch(
        "https://pay.pesapal.com/v3/api/Auth/RequestToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consumer_key: process.env.PESAPAL_CONSUMER_KEY,
            consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
          })
        }
      );

      const authData = await authResponse.json();
      token = authData.token;

      if (!token) {
        console.error("Auth Error:", authData);
        return res.status(500).json({
          error: "Failed to authenticate with Pesapal",
          details: authData
        });
      }

    } catch (err) {
      console.error("Token Fetch Error:", err);
      return res.status(500).json({
        error: "Pesapal auth request failed"
      });
    }

    /* =========================
       2. CREATE ORDER
    ========================= */
    let orderData;

    try {
      const orderResponse = await fetch(
        "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            id: "dental_" + Date.now(),
            currency: "KES",
            amount: amount,
            description: "Dental Consultation Payment",

            // ✅ IMPORTANT: match your frontend logic
            callback_url:
              "https://19982808.github.io/dental-saas/index.html?status=COMPLETED",

            notification_id: process.env.PESAPAL_IPN_ID,

            billing_address: {
              email_address: email,
              phone_number: phone || "",
              country_code: "KE",
              first_name: name,
              last_name: ""
            }
          })
        }
      );

      orderData = await orderResponse.json();

      console.log("Pesapal Response:", orderData);

      if (!orderData.redirect_url) {
        return res.status(500).json({
          error: "Pesapal order failed",
          details: orderData
        });
      }

    } catch (err) {
      console.error("Order Error:", err);
      return res.status(500).json({
        error: "Failed to create payment order"
      });
    }

    /* =========================
       3. RETURN URL
    ========================= */
    return res.status(200).json({
      redirect_url: orderData.redirect_url
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}
