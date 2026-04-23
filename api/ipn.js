export default async function handler(req, res) {
  try {
    // STEP 1: AUTH
    const auth = await fetch("https://pay.pesapal.com/v3/api/Auth/RequestToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
      })
    });

    const authText = await auth.text();
    console.log("AUTH RESPONSE RAW:", authText);

    const authData = JSON.parse(authText);
    const token = authData.token;

    if (!token) {
      return res.status(500).json({
        error: "No token received",
        authData
      });
    }

    // STEP 2: GET IPNs
    const ipnRes = await fetch("https://pay.pesapal.com/v3/api/URLSetup/GetIpnList", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const ipnText = await ipnRes.text();
    console.log("IPN RESPONSE RAW:", ipnText);

    return res.status(200).send(ipnText);

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
