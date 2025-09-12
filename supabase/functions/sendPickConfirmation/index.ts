import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or "http://localhost:5173" for dev
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};


serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, picks, pointSpreads, survivorPick, dbs, week } = await req.json();

    if (!email || !picks || !week) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, picks, or week" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply-confirm@jwnflpickem.com";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Brevo API key not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Build HTML content
    const picksHtml = picks.map((p: string) => `<li>${p}</li>`).join("");
    const pointSpreadsHtml = pointSpreads
      ? `<p><strong>Point Spreads:</strong></p><ul>${Object.entries(pointSpreads)
          .map(([game, ps]) => `<li>${game}: ${ps}</li>`).join("")}</ul>`
      : "";
    const dbsHtml = dbs
      ? `<p><strong>Drive-By Picks:</strong></p><ul>${Object.entries(dbs)
          .map(([game, db]) => `<li>${game}: ${db}</li>`).join("")}</ul>`
      : "";
    const survivorHtml = survivorPick ? `<p><strong>Survivor Pick:</strong> ${survivorPick}</p>` : "";

    const htmlContent = `
      <p>Hi,</p>
      <p>Thanks for submitting your picks for Week ${week}!</p>
      <p><strong>Your Picks:</strong></p>
      <ul>${picksHtml}</ul>
      ${pointSpreadsHtml}
      ${dbsHtml}
      ${survivorHtml}
      <p>Good luck!</p>
    `;

    // Send email via Brevo
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: "JW NFL Pick'em" },
        to: [{ email }],
        subject: `Your NFL Pick'em Picks for Week ${week}`,
        htmlContent,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return new Response(
        JSON.stringify({ error: "Brevo API error", details: errorText }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
