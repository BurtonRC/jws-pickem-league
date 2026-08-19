#!/usr/bin/env node

/**
 * Process a completed NFL week.
 *
 * Production flow:
 *
 * Results Processor
 *      ↓
 * game_results
 *      ↓
 * compute_weekly_results(season, week)
 *      ↓
 * process_survivor_week(week, season)
 *      ↓
 * weekly_results / Survivor state
 *
 * Usage:
 *   node scripts/processWeek.js --season 2025 --week 1
 *
 * ENV:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import process from 'node:process';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------- CLI ARGS ----------

const rawArgs = process.argv.slice(2);
const args = {};

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i].replace(/^--/, '');

  if (arg.includes('=')) {
    const [key, ...rest] = arg.split('=');
    args[key] = rest.join('=');
  } else {
    args[arg] = rawArgs[i + 1];
    i++;
  }
}

const SEASON = Number(args.season);
const WEEK = Number(args.week);

if (!Number.isInteger(SEASON) || !Number.isInteger(WEEK)) {
  console.error(
    'Missing or invalid arguments.'
  );
  console.error(
    'Usage: node scripts/processWeek.js --season 2025 --week 1'
  );
  process.exit(1);
}

// ---------- SUPABASE ----------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.'
  );
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// ---------- VERIFY GAME RESULTS ----------

console.log(
  `Processing ${SEASON} Week ${WEEK}...`
);

const {
  data: gameResults,
  error: gameResultsError,
} = await supabase
  .from('game_results')
  .select(`
    game_id,
    home_team,
    away_team,
    home_score,
    away_score,
    winner
  `)
  .eq('season', SEASON)
  .eq('week', WEEK);

if (gameResultsError) {
  console.error(
    'Error loading game_results:',
    gameResultsError
  );
  process.exit(1);
}

if (!gameResults || gameResults.length === 0) {
  console.error(
    `No game_results found for ${SEASON} Week ${WEEK}.`
  );
  console.error(
    'The Results Processor must populate game_results before processWeek.js is run.'
  );
  process.exit(1);
}

console.log(
  `Found ${gameResults.length} game result(s).`
);

// ---------- VERIFY PICKS ----------

const {
  count: weeklyPickCount,
  error: weeklyPicksError,
} = await supabase
  .from('weekly_picks')
  .select('id', {
    count: 'exact',
    head: true,
  })
  .eq('season', SEASON)
  .eq('week', WEEK);

if (weeklyPicksError) {
  console.error(
    'Error checking weekly_picks:',
    weeklyPicksError
  );
  process.exit(1);
}

console.log(
  `Found ${weeklyPickCount ?? 0} weekly pick row(s).`
);

// ---------- COMPUTE WEEKLY RESULTS ----------

console.log(
  `Running compute_weekly_results(${SEASON}, ${WEEK})...`
);

const {
  error: computeError,
} = await supabase.rpc(
  'compute_weekly_results',
  {
    target_season: SEASON,
    target_week: WEEK,
  }
);

if (computeError) {
  console.error(
    'compute_weekly_results failed:',
    computeError
  );
  process.exit(1);
}

console.log(
  'Weekly scoring completed.'
);

// ---------- PROCESS SURVIVOR ----------

console.log(
  `Running process_survivor_week(${WEEK}, ${SEASON})...`
);

const {
  data: survivorResults,
  error: survivorError,
} = await supabase.rpc(
  'process_survivor_week',
  {
    p_week: WEEK,
    p_season: SEASON,
  }
);

if (survivorError) {
  console.error(
    'process_survivor_week failed:',
    survivorError
  );
  process.exit(1);
}

console.log(
  `Survivor processing completed: ${
    survivorResults?.length ?? 0
  } result(s).`
);

// ---------- VERIFY WEEKLY RESULTS ----------

const {
  count: weeklyResultCount,
  error: weeklyResultsError,
} = await supabase
  .from('weekly_results')
  .select('id', {
    count: 'exact',
    head: true,
  })
  .eq('season', SEASON)
  .eq('week', WEEK);

if (weeklyResultsError) {
  console.error(
    'Error verifying weekly_results:',
    weeklyResultsError
  );
  process.exit(1);
}

console.log(
  `weekly_results contains ${
    weeklyResultCount ?? 0
  } row(s) for ${SEASON} Week ${WEEK}.`
);

// ---------- COMPLETE ----------

console.log(
  `Completed ${SEASON} Week ${WEEK} successfully.`
);