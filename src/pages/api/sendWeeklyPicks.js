import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { picks, pointSpreads, dbs, week, userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ success: false, error: "User email missing." });
  }

  try {
    // SMTP setup (use environment variables)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Build email content
    let message = `Your picks for Week ${week}:\n\n`;
    for (const [gameId, team] of Object.entries(picks)) {
      message += `Game ${gameId}: ${team}`;
      if (pointSpreads?.[gameId]) message += ` (${pointSpreads[gameId]})`;
      if (dbs?.[gameId]) message += ` [DB: ${dbs[gameId]}]`;
      message += "\n";
    }

    // Send the email
    await transporter.sendMail({
      from: `"NFL PickEm" <noreply@yourdomain.com>`,
      to: userEmail,
      subject: `Week ${week} Picks Confirmation`,
      text: message
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to send email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
