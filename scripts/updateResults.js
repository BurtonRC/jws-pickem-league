import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch"; // make sure fetch is imported

// Get command line arguments
// Usage: node updateResults.js <week> [<seasonType>]
// seasonType: 1 = preseason, 2 = regular season (default), 3 = postseason
const args = process.argv.slice(2);
const week = args[0] ? parseInt(args[0], 10) : 1; // default week 1
const seasonType = args[1] ? parseInt(args[1], 10) : 2; // default regular season

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // must be service role for upserts
);

// 1. Fetch NFL results from ESPN API
async function fetchResults(week, seasonType) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=${seasonType}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ESPN API: ${res.statusText}`);
  const data = await res.json();

  return data.events.map((event) => {
    const id = event.id;
    const competitors = event.competitions[0].competitors;
    const competition = event.competitions[0];

    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    const winner = competitors.find((c) => c.winner)?.team?.displayName || null;

    return {
      game_id: id,
      week,
      home_team: home.team.displayName,
      away_team: away.team.displayName,
      winner,
      db_team: null,
      correct_spread: null,
      competitionData: competition, // attach competition for kickoff/day
    };
  });
}

// 2. Upsert results into game_results and weekly_games
async function upsertResults(results) {
  // Upsert game_results
  const { error: grError } = await supabase.from("game_results").upsert(
    results.map((r) => ({
      game_id: r.game_id,
      week: r.week,
      home_team: r.home_team,
      away_team: r.away_team,
      winner: r.winner,
      db_team: r.db_team,
      correct_spread: r.correct_spread,
    }))
  );
  if (grError) console.error("Supabase insert error (game_results):", grError);
  else console.log(`✅ Upserted ${results.length} game results`);

  // Upsert weekly_games
  for (const game of results) {
    const competition = game.competitionData;
    if (!competition) continue;

    const kickoffUtc = competition.date || null;
    const day = kickoffUtc
      ? new Date(kickoffUtc).toLocaleDateString("en-US", { weekday: "long" })
      : null;

    // Skip invalid matchups
    if (!game.home_team || !game.away_team) {
      console.warn(
        `⚠️ Skipping invalid matchup: ${game.home_team} vs ${game.away_team}`
      );
      continue;
    }

    const { error: wgError } = await supabase.from("weekly_games").upsert(
      {
        week_number: week,
        teams: [game.home_team, game.away_team],
        day: day,
        kickoff_utc: kickoffUtc,
        db_label: null,
        db_team: null,
        point_spread: null,
      },
      {
        onConflict: ["week_number", "teams"],
      }
    );
    if (wgError)
      console.error(
        `Supabase error upserting weekly_games for ${game.home_team} vs ${game.away_team}:`,
        wgError
      );
  }
}

// 3. Run weekly compute function (RPC)
async function computeWeeklyResults(week) {
  const { error } = await supabase.rpc("compute_weekly_results", {
    target_week: week,
  });
  if (error) throw error;
  console.log(`✅ Computed weekly results for week ${week}`);
}

// 4. Resolve Survivor picks
async function resolveSurvivor(week) {
  const { data: picks, error } = await supabase
    .from("survivor_picks")
    .select("id, user_id, team")
    .eq("week", week);

  if (error) throw error;

  for (const pick of picks) {
    const { data: result, error: grErr } = await supabase
      .from("game_results")
      .select("winner")
      .eq("week", week)
      .or(`home_team.eq.${pick.team},away_team.eq.${pick.team}`)
      .maybeSingle();

    if (grErr) throw grErr;

    const survivor_result = result?.winner === pick.team ? "win" : "loss";

    const { error: updErr } = await supabase
      .from("weekly_results")
      .update({ survivor_result })
      .eq("user_id", pick.user_id)
      .eq("week", week);

    if (updErr) throw updErr;
  }

  console.log(`✅ Survivor picks resolved for week ${week}`);
}

// 5. Orchestrate pipeline
async function runPipeline() {
  console.log(`🚀 Starting update pipeline for week ${week}, seasonType ${seasonType}`);

  const results = await fetchResults(week, seasonType);
  await upsertResults(results);
  await computeWeeklyResults(week);
  await resolveSurvivor(week);

  console.log("🎉 End-of-week pipeline complete");
}

runPipeline().catch((err) => {
  console.error("❌ Pipeline failed", err);
  process.exit(1);
});
