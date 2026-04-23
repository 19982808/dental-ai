export default async function handler(req, res) {
  try {
    // STEP 1: Get token
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

    const authData = await auth.json();
    const token = authData.token;

    // STEP 2: Get IPN list
    const ipnRes = await fetch("https://pay.pesapal.com/v3/api/URLSetup/GetIpnList", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const ipnData = await ipnRes.json();

    return res.status(200).json(ipnData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
