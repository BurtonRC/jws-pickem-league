// scripts/syncGameResults.js
import 'dotenv/config';
import fetch from 'node-fetch';     // node v18+ may use global fetch; this is safe
import { createClient } from '@supabase/supabase-js';
import { driveByGames, pointSpreads } from '../src/data/leagueConfig.js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchWeekEvents(week) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

function determineCorrectSpread(homeTeam, awayTeam, homeScore, awayScore, gameId) {
  // If pointSpreads contains this gameId, it returns the team name (favorite or underdog)
  const spreadArr = pointSpreads[gameId];
  if (!spreadArr || spreadArr.length === 0) return null;
  const spread = Number(spreadArr[0]); // numeric spread

  // Determine margin and favorite/underdog by comparing scores
  const margin = homeScore - awayScore;
  // Here we treat positive margin => home ahead
  // We'll decide favorite by the convention you use in leagueConfig (spread sign). To be safe:
  // If abs(margin) >= abs(spread) then the team that covered is the winner by spread.
  if (Math.abs(margin) >= Math.abs(spread)) {
    // Which team covered? If margin > 0 home covered, else away covered
    return margin >= 0 ? homeTeam : awayTeam;
  }
  // If spread not covered, no correct_spread (null)
  return null;
}

async function upsertGameResult(game) {
  const { week, gameId, homeTeam, awayTeam, winner, dbTeam, correctSpreadTeam, homeScore, awayScore } = game;

  try {
    const { error } = await supabase
      .from('game_results')
      .upsert({
        week,
        game_id: gameId,
        home_team: homeTeam,
        away_team: awayTeam,
        winner,
        db_team: dbTeam,
        correct_spread: correctSpreadTeam,
        home_score: homeScore,
        away_score: awayScore,
        created_at: new Date().toISOString()
      }, { onConflict: ['week', 'game_id'] });

    if (error) throw error;

    console.log(`Updated game ${gameId}: ${homeTeam} vs ${awayTeam}`);
  } catch (err) {
    console.error(`Error upserting game ${gameId}:`, err);
  }
}

async function syncWeek(week) {
  console.log(`Syncing week ${week} from ESPN...`);
  const events = await fetchWeekEvents(week);

  for (const ev of events) {
    const gameId = ev.id;
    const comp = ev.competitions && ev.competitions[0];
    if (!comp) continue;

    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    const homeTeam = home.team.displayName;
    const awayTeam = away.team.displayName;

    // support different score locations; use numeric values if present
    const homeScore = Number(home.score ?? home.score?.value ?? 0) || 0;
    const awayScore = Number(away.score ?? away.score?.value ?? 0) || 0;

    let winner = null;
    if (homeScore > awayScore) winner = homeTeam;
    else if (awayScore > homeScore) winner = awayTeam;

    const dbTeam = driveByGames[gameId] || null;

    // correct_spread: team that covered (or NULL)
    const correctSpreadTeam = determineCorrectSpread(homeTeam, awayTeam, homeScore, awayScore, gameId);

    await upsertGameResult({
      week,
      gameId,
      homeTeam,
      awayTeam,
      winner,
      dbTeam,
      correctSpreadTeam,
      homeScore,
      awayScore
    });
  }

  // call compute function
  try {
    const { data, error } = await supabase.rpc('compute_weekly_results', { week });
    if (error) throw error;
    console.log('compute_weekly_results executed for week', week);
  } catch (err) {
    console.error('Error executing compute_weekly_results:', err);
  }
}

const args = process.argv.slice(2);
const weekArg = args[0] ? parseInt(args[0], 10) : null;

(async () => {
  try {
    const week = weekArg || 1;
    await syncWeek(week);
  } finally {
    console.log('Sync completed.');
  }
})();
