export default async function handler(req, res) {
  console.log("IPN RECEIVED:", req.body);

  return res.status(200).json({
    status: "ok"
  });
}
