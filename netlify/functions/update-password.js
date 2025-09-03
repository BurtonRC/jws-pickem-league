export default function handler(req, res) {
  const token = req.query.token;
  if (!token) {
    res.status(400).send("Missing token");
    return;
  }

  // Redirect to SPA hash route with token
  const redirectUrl = `https://jwnflpickem.com/#/update-password?access_token=${token}`;

  res.writeHead(302, { Location: redirectUrl });
  res.end();
}
