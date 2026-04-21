export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, amount } = req.body;

    // 1. Get auth token
    const authResponse = await fetch(
      "https://pay.pesapal.com/v3/api/Auth/RequestToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          consumer_key: process.env.PESAPAL_CONSUMER_KEY,
          consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
        })
      }
    );

    const authData = await authResponse.json();
    const token = authData.token;

    // 2. Create payment request
    const paymentResponse = await fetch(
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
          description: "Dental Clinic Payment",
          callback_url: "https://your-site.vercel.app/success.html",
          notification_id: "your-ipn-id",
          billing_address: {
            email_address: email,
            first_name: name,
            last_name: "",
            phone_number: "",
            country_code: "KE"
          }
        })
      }
    );

    const data = await paymentResponse.json();

    // 3. Send redirect URL back to frontend
    return res.status(200).json({
      redirect_url: data.redirect_url
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
