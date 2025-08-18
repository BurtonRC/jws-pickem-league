#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/processWeek.js --season 2025 --week 1 --schedule ./src/data/nfl_schedule_2025.json
 *
 * ENV:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (service key so we can write)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import fetch from 'node-fetch';                 // Node 18 has fetch, but this keeps it explicit
import { createClient } from '@supabase/supabase-js';

// ---------- CLI ARGS ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const SEASON = Number(args.season || 2025);
const WEEK   = Number(args.week);
const SCHEDULE_JSON = args.schedule || './src/data/nfl_schedule_2025.json';

if (!WEEK || !SEASON) {
  console.error('Missing required args. Example: --season 2025 --week 1');
  process.exit(1);
}

// ---------- SUPABASE ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- HELPERS ----------
const TEAM_NAME_MAP = new Map([
  // Normalize ESPN names to your JSON names (adjust as needed)
  ['NY Jets', 'NY Jets'],
  ['New York Jets', 'NY Jets'],
  ['NY Giants', 'NY Giants'],
  ['New York Giants', 'NY Giants'],
  ['LA Chargers', 'LA Chargers'],
  ['Los Angeles Chargers', 'LA Chargers'],
  ['LA Rams', 'LA Rams'],
  ['Los Angeles Rams', 'LA Rams'],
  ['Washington Commanders', 'Washington'],
  ['Green Bay Packers', 'Green Bay'],
  ['San Francisco 49ers', 'San Francisco'],
  ['New England Patriots', 'New England'],
  ['Tampa Bay Buccaneers', 'Tampa Bay'],
  ['Kansas City Chiefs', 'Kansas City'],
  ['Las Vegas Raiders', 'Las Vegas'],
  ['Jacksonville Jaguars', 'Jacksonville'],
  ['Arizona Cardinals', 'Arizona'],
  ['New Orleans Saints', 'New Orleans'],
  ['Detroit Lions', 'Detroit'],
  ['Minnesota Vikings', 'Minnesota'],
  ['Chicago Bears', 'Chicago'],
  ['Cleveland Browns', 'Cleveland'],
  ['Cincinnati Bengals', 'Cincinnati'],
  ['Baltimore Ravens', 'Baltimore'],
  ['Pittsburgh Steelers', 'Pittsburgh'],
  ['Philadelphia Eagles', 'Philadelphia'],
  ['Dallas Cowboys', 'Dallas'],
  ['Buffalo Bills', 'Buffalo'],
  ['Miami Dolphins', 'Miami'],
  ['Indianapolis Colts', 'Indianapolis'],
  ['Tennessee Titans', 'Tennessee'],
  ['Denver Broncos', 'Denver'],
  ['Seattle Seahawks', 'Seattle'],
  ['Atlanta Falcons', 'Atlanta'],
  ['Carolina Panthers', 'Carolina'],
  ['Houston Texans', 'Houston'],
]);

function normTeam(name) {
  if (!name) return '';
  return TEAM_NAME_MAP.get(name) || name.trim();
}

function matchupKey(a, b) {
  // order-insensitive key for “same two teams”
  const A = normTeam(a);
  const B = normTeam(b);
  return [A, B].sort().join(' @ ');
}

function parseSpreadPick(pickStr) {
  // Example input from your UI: "Minnesota Covers +3.5" or "Detroit Cover -3.5"
  if (!pickStr) return null;
  const m = pickStr.match(/^(.+?)\s+Cover[s]?\s+([+-]?\d+(\.\d+)?)$/i);
  if (!m) return null;
  const team = m[1].trim();
  const spread = Number(m[2]);
  return { team: normTeam(team), spread };
}

function teamCovered({ team, spread }, homeTeam, awayTeam, homeScore, awayScore) {
  // Coverage is: team_score + spread > opp_score  (push counts as NOT a win)
  // We assume spread value is attached to the team the user picked (not book favorite).
  const isHome = normTeam(homeTeam) === team;
  const teamScore = isHome ? Number(homeScore) : Number(awayScore);
  const oppScore  = isHome ? Number(awayScore) : Number(homeScore);

  return (teamScore + spread) > oppScore; // strict > (no push as win)
}

// ---------- LOAD LOCAL SCHEDULE ----------
const scheduleRaw = fs.readFileSync(path.resolve(SCHEDULE_JSON), 'utf8');
const schedule = JSON.parse(scheduleRaw);

// Build a lookup of this week’s games by local game id and by matchup
const weekObj = schedule.weeks.find((w) => Number(w.weekNumber) === WEEK);
if (!weekObj) {
  console.error(`Week ${WEEK} not found in ${SCHEDULE_JSON}`);
  process.exit(1);
}

const localGames = weekObj.games; // [{ id, teams: [away, home], dbTeam? ... }]
const gamesByLocalId = new Map(localGames.map(g => [String(g.id), g]));
const matchupToLocalId = new Map(
  localGames.map(g => [matchupKey(g.teams[0], g.teams[1]), String(g.id)])
);

// ---------- FETCH ESPN FINAL RESULTS ----------
async function fetchEspnResults({ season, week }) {
  // Regular season = seasontype=2. If you need preseason/postseason, adjust.
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&year=${season}&week=${week}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN fetch failed ${res.status}`);
  const data = await res.json();

  const results = [];
  for (const evt of data.events || []) {
    const comp = evt.competitions?.[0];
    if (!comp) continue;
    const competitors = comp.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');

    const homeTeam = normTeam(home?.team?.shortDisplayName || home?.team?.displayName);
    const awayTeam = normTeam(away?.team?.shortDisplayName || away?.team?.displayName);

    const homeScore = Number(home?.score ?? 0);
    const awayScore = Number(away?.score ?? 0);

    const winnerTeam = (home?.winner ? homeTeam : (away?.winner ? awayTeam : null));

    results.push({
      eventId: evt.id,
      completed: comp.status?.type?.completed ?? false,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winnerTeam,
      key: matchupKey(homeTeam, awayTeam),
    });
  }
  return results;
}

const espnResults = await fetchEspnResults({ season: SEASON, week: WEEK });

// Build quick lookup
const espnByKey = new Map(espnResults.map(r => [r.key, r]));

// ---------- LOAD WEEKLY PICKS ----------
const { data: weeklyPicks, error: wpErr } = await supabase
  .from('weekly_picks')
  .select('id, user_id, week, picks, point_spreads, survivor_pick')
  .eq('week', WEEK);

if (wpErr) {
  console.error('Error loading weekly_picks:', wpErr);
  process.exit(1);
}

// ---------- SCORING ----------
for (const row of weeklyPicks) {
  const { user_id, picks = {}, point_spreads = {}, survivor_pick } = row;

  let winsThisWeek = 0;
  let dbWinsThisWeek = 0;          // will be added to season total
  let spreadWinsThisWeek = 0;      // will be added to season total

  // Per-game processing
  for (const [localGameId, pickedTeamRaw] of Object.entries(picks)) {
    const game = gamesByLocalId.get(String(localGameId));
    if (!game) continue;

    const away = normTeam(game.teams?.[0]);
    const home = normTeam(game.teams?.[1]);
    const key  = matchupKey(home, away);

    const result = espnByKey.get(key);
    if (!result || !result.completed) {
      // Skip games without a completed result yet
      continue;
    }

    const pickedTeam = normTeam(pickedTeamRaw);
    if (pickedTeam && result.winnerTeam && pickedTeam === result.winnerTeam) {
      winsThisWeek += 1;
    }

    // Drive-by: if user’s picked team equals scheduled dbTeam AND the pick won, count it
    // Your JSON sometimes has db markers like "Dallas(db)". Handle both `dbTeam` and suffix.
    let dbTeam = game.dbTeam ? normTeam(game.dbTeam.replace(/\(db\)/i, '').trim()) : null;
    if (!dbTeam && game.dbLabel) dbTeam = normTeam(game.dbLabel);
    if (!dbTeam) {
      // also try discovering if a team includes (db)
      const maybeDb = game.teams.find(t => /\(db\)/i.test(t));
      if (maybeDb) dbTeam = normTeam(maybeDb.replace(/\(db\)/i, '').trim());
    }
    if (dbTeam && pickedTeam === dbTeam && pickedTeam === result.winnerTeam) {
      dbWinsThisWeek += 1;
    }

    // Point spread win if user selected a spread for this game
    const psPickRaw = point_spreads[String(localGameId)];
    const parsed = parseSpreadPick(psPickRaw);
    if (parsed) {
      if (teamCovered(parsed, result.homeTeam, result.awayTeam, result.homeScore, result.awayScore)) {
        spreadWinsThisWeek += 1;
      }
    }
  }

  // Survivor result for this user for this week
  let survivorResult = null;
  if (survivor_pick) {
    const survTeam = normTeam(survivor_pick);
    // Find the game that contains this team
    const matching = espnResults.find(r => [r.homeTeam, r.awayTeam].includes(survTeam));
    if (matching && matching.completed) {
      survivorResult = (matching.winnerTeam === survTeam) ? 'win' : 'loss';
    }
  }

  // Compute prev_week_score and cumulative totals
  const { data: prevRes, error: prevErr } = await supabase
    .from('weekly_results')
    .select('this_week_score, overall_score, total_drive_bys, total_point_spreads')
    .eq('user_id', user_id)
    .lt('week', WEEK)
    .order('week', { ascending: false })
    .limit(1);

  const prevWeekScore = prevRes?.[0]?.this_week_score ?? 0;
  const prevOverall   = prevRes?.[0]?.overall_score ?? 0;
  const prevDbTotal   = prevRes?.[0]?.total_drive_bys ?? 0;
  const prevPsTotal   = prevRes?.[0]?.total_point_spreads ?? 0;

  const newOverall = prevOverall + winsThisWeek;
  const newDbTotal = prevDbTotal + dbWinsThisWeek;
  const newPsTotal = prevPsTotal + spreadWinsThisWeek;

  if (prevErr) {
    console.error('Prev results fetch error:', prevErr);
  }

  // Upsert weekly_results
  const { error: wrErr } = await supabase
    .from('weekly_results')
    .upsert({
      user_id,
      week: WEEK,
      this_week_score: winsThisWeek,
      prev_week_score: prevWeekScore,
      overall_score: newOverall,
      total_drive_bys: newDbTotal,         // cumulative totals (as requested)
      total_point_spreads: newPsTotal,     // cumulative totals (as requested)
      survivor_result: survivorResult,
    }, { onConflict: 'user_id,week' });

  if (wrErr) {
    console.error(`weekly_results upsert error for user ${user_id}:`, wrErr);
  } else {
    console.log(`Scored user ${user_id}: week=${WEEK} wins=${winsThisWeek} DB+=${dbWinsThisWeek} PS+=${spreadWinsThisWeek} survivor=${survivorResult}`);
  }
}

console.log('Done.');
