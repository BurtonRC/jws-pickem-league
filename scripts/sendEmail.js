import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendWeeklyPicksEmail(userEmail, picks) {
  const picksList = Object.entries(picks)
    .map(([gameId, team]) => `${gameId}: ${team}`)
    .join("\n");

  const msg = {
    to: userEmail,
    from: "no-reply@yourapp.com",
    subject: "Your Weekly Picks",
    text: `Here are your picks for the week:\n\n${picksList}`,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent to", userEmail);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}
