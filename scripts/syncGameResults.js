// scripts/syncGameResults.js

import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------
// SUPABASE
// ---------------------------------------------------------

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------
// CLI ARGS
// ---------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const clean = arg.replace(/^--/, '');
    const [key, ...rest] = clean.split('=');
    return [key, rest.length ? rest.join('=') : true];
  })
);

const SEASON = Number(args.season);
const WEEK = Number(args.week);

if (!Number.isInteger(SEASON) || !Number.isInteger(WEEK)) {
  console.error(
    'Usage: node scripts/syncGameResults.js --season=2025 --week=1'
  );
  process.exit(1);
}

// ---------------------------------------------------------
// ESPN
// ---------------------------------------------------------

async function fetchWeekEvents(season, week) {
  const url =
  `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
  `?year=${season}&seasontype=2&week=${week}`;

  console.log(
    `Fetching ESPN results for ${season} Week ${week}...`
  );

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`ESPN fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return data.events || [];
}

// ---------------------------------------------------------
// GET LEAGUE CONFIGURATION
// ---------------------------------------------------------

async function loadLeagueConfig(season, week) {
  const { data, error } = await supabase
    .from('league_game_config')
    .select(`
      game_id,
      drive_by_enabled,
      drive_by_team,
      ps_game_of_week,
      ps_team,
      spread
    `)
    .eq('season', season)
    .eq('week', week);

  if (error) {
    throw new Error(
      `Failed to load league_game_config: ${error.message}`
    );
  }

  return new Map(
    (data || []).map((row) => [
      String(row.game_id),
      row,
    ])
  );
}

// ---------------------------------------------------------
// UPSERT GAME RESULT
// ---------------------------------------------------------

async function upsertGameResult({
  season,
  week,
  gameId,
  homeTeam,
  awayTeam,
  winner,
  homeScore,
  awayScore,
}) {
  const { error } = await supabase
    .from('game_results')
    .upsert(
      {
        season,
        week,
        game_id: gameId,
        home_team: homeTeam,
        away_team: awayTeam,
        winner,
        home_score: homeScore,
        away_score: awayScore,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'season,week,game_id',
      }
    );

  if (error) {
    throw new Error(
      `Failed to upsert game ${gameId}: ${error.message}`
    );
  }
}

// ---------------------------------------------------------
// PROCESS RESULTS
// ---------------------------------------------------------

async function syncWeek(season, week) {
  console.log(
    `\nSyncing ${season} Week ${week}...`
  );

  const events = await fetchWeekEvents(
    season,
    week
  );

  if (!events.length) {
    throw new Error(
      `ESPN returned no games for ${season} Week ${week}.`
    );
  }

  const leagueConfig =
    await loadLeagueConfig(season, week);

  console.log(
    `Loaded ${leagueConfig.size} league game configurations.`
  );

  let completedCount = 0;

  for (const event of events) {
    const gameId = String(event.id);

    const competition =
      event.competitions?.[0];

    if (!competition) continue;

    const home =
      competition.competitors?.find(
        (c) => c.homeAway === 'home'
      );

    const away =
      competition.competitors?.find(
        (c) => c.homeAway === 'away'
      );

    if (!home || !away) continue;

    const completed =
      competition.status?.type?.completed === true;

    // Only write completed games.
    if (!completed) {
      continue;
    }

    const homeTeam =
      home.team?.displayName;

    const awayTeam =
      away.team?.displayName;

    const homeScore =
      Number(home.score ?? 0);

    const awayScore =
      Number(away.score ?? 0);

    let winner = null;

    if (homeScore > awayScore) {
      winner = homeTeam;
    } else if (awayScore > homeScore) {
      winner = awayTeam;
    }

    // Do not process an unfinished/tied result.
    if (!winner) {
      continue;
    }

    await upsertGameResult({
      season,
      week,
      gameId,
      homeTeam,
      awayTeam,
      winner,
      homeScore,
      awayScore,
    });

    const config =
      leagueConfig.get(gameId);

    console.log(
      `${awayTeam} ${awayScore} @ ${homeTeam} ${homeScore}` +
      ` → ${winner}` +
      (config?.drive_by_enabled
        ? ` | DB: ${config.drive_by_team}`
        : '') +
      (config?.ps_game_of_week
        ? ` | PS: ${config.ps_team} ${config.spread}`
        : '')
    );

    completedCount++;
  }

  console.log(
    `Stored ${completedCount} completed game result(s).`
  );

  if (completedCount === 0) {
  console.log(
    `No completed games found for ${season} Week ${week}.`
  );
  return;
}

  // -------------------------------------------------------
  // COMPUTE WEEKLY RESULTS
  // -------------------------------------------------------

  console.log(
    `Running compute_weekly_results(${season}, ${week})...`
  );

  const {
    error: computeError,
  } = await supabase.rpc(
    'compute_weekly_results',
    {
      target_season: season,
      target_week: week,
    }
  );

  if (computeError) {
    throw new Error(
      `compute_weekly_results failed: ${computeError.message}`
    );
  }

  console.log(
    'compute_weekly_results completed.'
  );

  // -------------------------------------------------------
  // SURVIVOR
  // -------------------------------------------------------

  console.log(
    `Running process_survivor_week(${week}, ${season})...`
  );

  const {
    data: survivorResults,
    error: survivorError,
  } = await supabase.rpc(
    'process_survivor_week',
    {
      p_week: week,
      p_season: season,
    }
  );

  if (survivorError) {
    throw new Error(
      `process_survivor_week failed: ${survivorError.message}`
    );
  }

  console.log(
    `Survivor processing completed: ${
      survivorResults?.length ?? 0
    } result(s).`
  );

  // -------------------------------------------------------
  // VERIFY
  // -------------------------------------------------------

  const {
    count: resultCount,
    error: verifyError,
  } = await supabase
    .from('weekly_results')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('season', season)
    .eq('week', week);

  if (verifyError) {
    throw new Error(
      `Unable to verify weekly_results: ${verifyError.message}`
    );
  }

  console.log(
    `weekly_results contains ${
      resultCount ?? 0
    } row(s) for ${season} Week ${week}.`
  );

  console.log(
    `\n${season} Week ${week} sync completed successfully.`
  );
}

// ---------------------------------------------------------
// RUN
// ---------------------------------------------------------

(async () => {
  try {
    await syncWeek(SEASON, WEEK);
  } catch (error) {
    console.error(
      '\nSync failed:'
    );
    console.error(error.message);
    process.exit(1);
  }
})();