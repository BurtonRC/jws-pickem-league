import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // needs service role (for insert/update)
);

// 1. Load results from ESPN API
async function loadResults(week, seasonType = 2) {
  // seasonType: 1 = preseason, 2 = regular season (default), 3 = postseason
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=${seasonType}`;
  // preseason 1  regular season 2  postseason 3 example for preseason week 3 - node scripts/updateResults.js 3 2025 1

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`⚠️ ESPN API error: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();

  // Load official weekly_games for this week from Supabase
  const { data: officialGames, error: wgError } = await supabase
    .from("weekly_games")
    .select("id, teams")
    .eq("week_number", week);

  if (wgError) {
    console.error("Supabase fetch weekly_games error:", wgError);
    return;
  }

  for (const event of data.events) {
    const competition = event.competitions[0];
    const gameId = event.id;
    const home = competition.competitors.find((c) => c.homeAway === "home");
    const away = competition.competitors.find((c) => c.homeAway === "away");

    // Skip any game that doesn't match an official matchup
    const matchupExists = officialGames.some((g) =>
      g.teams.includes(home.team.displayName) &&
      g.teams.includes(away.team.displayName)
    );
    if (!matchupExists) {
      console.warn(
        `⚠️ Skipping unmatched game ${home.team.displayName} vs ${away.team.displayName}`
      );
      continue;
    }

    const winner =
      home.winner === true ? home.team.displayName : away.team.displayName;

    // TODO: compute db_team / correct_spread rules here
    const dbTeam = null;
    const correctSpread = null;

    const { error } = await supabase.from("game_results").upsert({
      game_id: gameId,
      week,
      winner,
      db_team: dbTeam,
      correct_spread: correctSpread,
    });

    if (error) {
      console.error("Supabase insert error:", error);
    } else {
      console.log(`Saved result for game ${gameId}: ${winner}`);
    }
  }
}

// 2. Execute for command-line week and optional seasonType
const targetWeek = process.argv[2] || 1;
const seasonType = process.argv[3] ? parseInt(process.argv[3], 10) : 2;

loadResults(targetWeek, seasonType).then(() => {
  console.log("Done loading results.");
});
