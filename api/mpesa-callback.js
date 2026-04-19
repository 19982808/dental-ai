// api/mpesa-callback.js — Safaricom posts payment result here
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const body = req.body?.Body?.stkCallback;
  if (!body) return res.status(400).json({ error: "Invalid callback" });

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = body;

  if (ResultCode === 0) {
    // Payment successful
    const items = CallbackMetadata?.Item || [];
    const get   = (name) => items.find(i => i.Name === name)?.Value;

    const payment = {
      checkoutRequestId: CheckoutRequestID,
      amount:            get("Amount"),
      mpesaReceiptNumber: get("MpesaReceiptNumber"),
      phone:             get("PhoneNumber"),
      transactionDate:   get("TransactionDate"),
    };

    console.log("✅ Payment received:", payment);
    // TODO: save to your DB here (Supabase, Firebase, etc.)

  } else {
    // Payment failed or cancelled
    console.warn("❌ Payment failed:", ResultCode, ResultDesc);
  }

  // Safaricom expects this exact response
  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}
