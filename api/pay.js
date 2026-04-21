export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, phone, amount } = req.body;

    const payload = {
      tx_ref: "dental_" + Date.now(),
      amount: amount,
      currency: "KES",
      payment_options: "card,mpesa",
      redirect_url: "https://your-domain.vercel.app/success.html",
      customer: {
        email,
        phonenumber: phone,
        name,
      },
      customizations: {
        title: "Dental Clinic Payment",
        description: "Payment for dental services",
      },
    };

    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
