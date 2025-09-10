// scripts/syncGameResults.js
import 'dotenv/config';
import fetch from 'node-fetch';     // node v18+ may use global fetch; this is safe
import pkg from 'pg';
const { Pool } = pkg;
import { driveByGames, pointSpreads } from '../src/data/leagueConfig.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

    // Upsert into game_results via SQL using parameterized query
    const upsertSql = `
      INSERT INTO game_results (week, game_id, home_team, away_team, winner, db_team, correct_spread, home_score, away_score, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
      ON CONFLICT (week, game_id)
      DO UPDATE SET
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        winner = EXCLUDED.winner,
        db_team = EXCLUDED.db_team,
        correct_spread = EXCLUDED.correct_spread,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        created_at = now();
    `;
    const params = [week, gameId, homeTeam, awayTeam, winner, dbTeam, correctSpreadTeam, homeScore, awayScore];

    try {
      await pool.query(upsertSql, params);
      console.log(`Updated game ${gameId}: ${homeTeam} vs ${awayTeam}`);
    } catch (err) {
      console.error(`Error upserting game ${gameId}:`, err);
    }
  }

  // call compute function
  try {
    const res = await pool.query('SELECT compute_weekly_results($1)', [week]);
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
    await pool.end();
  }
})();
