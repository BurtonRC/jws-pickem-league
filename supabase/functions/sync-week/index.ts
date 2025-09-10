import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const week = parseInt(url.searchParams.get("week") || "1", 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Fetch NFL games from ESPN
    const resp = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}`
    );
    const jsonData = await resp.json();

    // 2️⃣ Upsert game results
    for (const event of jsonData.events) {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === "home");
      const away = comp.competitors.find((c: any) => c.homeAway === "away");

      await supabase.from("game_results").upsert(
        {
          week,
          game_id: parseInt(event.id, 10),
          home_team: home.team.displayName,
          away_team: away.team.displayName,
          home_score: parseInt(home.score, 10),
          away_score: parseInt(away.score, 10),
          winner: home.winner ? home.team.displayName : away.team.displayName,
        },
        { onConflict: "week,game_id" }
      );
    }

    // 3️⃣ Update survivor picks
    const { data: picks } = await supabase
      .from("survivor_picks")
      .select("*")
      .eq("week", week);

    if (picks) {
      // Fetch profiles once to map user_id → username
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username");

      for (const pick of picks) {
        const pick_username = profiles?.find((p) => p.id === pick.user_id)?.username || "Unknown";

        const matchingGame = jsonData.events.find((event: any) =>
          event.competitions[0].competitors.some((c: any) => c.team.displayName === pick.team)
        );

        if (matchingGame) {
          const comp = matchingGame.competitions[0];
          const home = comp.competitors.find((c: any) => c.homeAway === "home");
          const away = comp.competitors.find((c: any) => c.homeAway === "away");
          const winner = home.winner ? home.team.displayName : away.team.displayName;

          const result = winner === pick.team ? "win" : "loss";

          // ✅ Update survivor pick result + username
          await supabase
            .from("survivor_picks")
            .update({ result, username: pick_username })
            .eq("id", pick.id);
        }
      }
    }

    // 4️⃣ Compute weekly results (leaderboard)
    await supabase.rpc("compute_weekly_results", { target_week: week });

    return new Response(JSON.stringify({ success: true, week }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ sync-week error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
