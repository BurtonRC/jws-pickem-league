#!/usr/bin/env node

import process from "node:process";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const SEASON = Number(args.season);
const WEEK = Number(args.week);

if (!SEASON || !WEEK) {
  console.error(
    "Usage: node scripts/diagnoseSurvivor.js --season=2025 --week=5"
  );
  process.exit(1);
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables not found.");
  console.error(
    "Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// This reproduces the old processor's team-name normalization.
const TEAM_NAME_MAP = new Map([
  ["NY Jets", "NY Jets"],
  ["New York Jets", "NY Jets"],
  ["NY Giants", "NY Giants"],
  ["New York Giants", "NY Giants"],
  ["LA Chargers", "LA Chargers"],
  ["Los Angeles Chargers", "LA Chargers"],
  ["LA Rams", "LA Rams"],
  ["Los Angeles Rams", "LA Rams"],
  ["Washington Commanders", "Washington"],
  ["Green Bay Packers", "Green Bay"],
  ["San Francisco 49ers", "San Francisco"],
  ["New England Patriots", "New England"],
  ["Tampa Bay Buccaneers", "Tampa Bay"],
  ["Kansas City Chiefs", "Kansas City"],
  ["Las Vegas Raiders", "Las Vegas"],
  ["Jacksonville Jaguars", "Jacksonville"],
  ["Arizona Cardinals", "Arizona"],
  ["New Orleans Saints", "New Orleans"],
  ["Detroit Lions", "Detroit"],
  ["Minnesota Vikings", "Minnesota"],
  ["Chicago Bears", "Chicago"],
  ["Cleveland Browns", "Cleveland"],
  ["Cincinnati Bengals", "Cincinnati"],
  ["Baltimore Ravens", "Baltimore"],
  ["Pittsburgh Steelers", "Pittsburgh"],
  ["Philadelphia Eagles", "Philadelphia"],
  ["Dallas Cowboys", "Dallas"],
  ["Buffalo Bills", "Buffalo"],
  ["Miami Dolphins", "Miami"],
  ["Indianapolis Colts", "Indianapolis"],
  ["Tennessee Titans", "Tennessee"],
  ["Denver Broncos", "Denver"],
  ["Seattle Seahawks", "Seattle"],
  ["Atlanta Falcons", "Atlanta"],
  ["Carolina Panthers", "Carolina"],
  ["Houston Texans", "Houston"],
]);

const oldNorm = (name) =>
  name ? TEAM_NAME_MAP.get(name) || name : "";

const clean = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ");

function aliases(team) {
  if (!team) return [];

  return [
    team.displayName,
    team.shortDisplayName,
    team.abbreviation,
    team.location,
    team.name,
    `${team.location || ""} ${team.name || ""}`.trim(),
  ].filter(Boolean);
}

async function main() {
  console.log("");
  console.log("==================================================");
  console.log("SURVIVOR READ-ONLY DIAGNOSTIC");
  console.log(`Season: ${SEASON}   Week: ${WEEK}`);
  console.log("NO DATABASE WRITES");
  console.log("==================================================");
  console.log("");

  // ------------------------------------------------
  // Load Survivor picks
  // ------------------------------------------------

  const { data: picks, error } = await supabase
    .from("survivor_picks")
    .select(
      "id,user_id,season,week,team,result,username"
    )
    .eq("season", SEASON)
    .eq("week", WEEK)
    .order("username");

  if (error) {
    throw error;
  }

  console.log(`Survivor picks found: ${picks.length}`);

  // ------------------------------------------------
  // Load ESPN games
  // ------------------------------------------------

  const url =
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
    `?seasontype=2&year=${SEASON}&week=${WEEK}`;

  console.log("");
  console.log("ESPN URL:");
  console.log(url);
  console.log("");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const games = (data.events || []).map((event) => {
    const competition = event.competitions?.[0];

    const competitors =
      competition?.competitors || [];

    const home = competitors.find(
      (c) => c.homeAway === "home"
    );

    const away = competitors.find(
      (c) => c.homeAway === "away"
    );

    const winner = home?.winner
      ? home.team
      : away?.winner
      ? away.team
      : null;

    return {
      completed:
        competition?.status?.type?.completed ?? false,

      home,

      away,

      winner,
    };
  });

  console.log(`ESPN games found: ${games.length}`);
  console.log("");

  let noMatch = 0;
  let oldMatch = 0;
  let aliasMatch = 0;
  let disagreements = 0;

  // ------------------------------------------------
  // Test every Survivor pick
  // ------------------------------------------------

  for (const pick of picks) {
    console.log(
      "--------------------------------------------------"
    );

    console.log(
      `${pick.username || "Unknown"} — ${pick.team}`
    );

    console.log(
      `Stored result: ${pick.result}`
    );

    if (!pick.team) {
      console.log(
        "CALCULATED: SKIPPED — no Survivor team"
      );
      continue;
    }

    const oldPick = oldNorm(pick.team);

    let matchedGame = null;
    let matchMethod = "";

    // ------------------------------------------------
    // 1. Reproduce OLD processor matching
    // ------------------------------------------------

    for (const game of games) {
      const homeName =
        game.home?.team?.shortDisplayName ||
        game.home?.team?.displayName ||
        "";

      const awayName =
        game.away?.team?.shortDisplayName ||
        game.away?.team?.displayName ||
        "";

      const oldHome = oldNorm(homeName);
      const oldAway = oldNorm(awayName);

      if (
        oldPick === oldHome ||
        oldPick === oldAway
      ) {
        matchedGame = game;
        matchMethod = "OLD NORMALIZATION";
        break;
      }
    }

    // ------------------------------------------------
    // 2. Try full-name/alias matching
    // ------------------------------------------------

    if (!matchedGame) {
      const wanted = clean(pick.team);

      for (const game of games) {
        const homeAliases = aliases(
          game.home?.team
        );

        const awayAliases = aliases(
          game.away?.team
        );

        const homeMatch = homeAliases.some(
          (name) => clean(name) === wanted
        );

        const awayMatch = awayAliases.some(
          (name) => clean(name) === wanted
        );

        if (homeMatch || awayMatch) {
          matchedGame = game;
          matchMethod = "FULL NAME / ALIAS";
          break;
        }
      }
    }

    // ------------------------------------------------
    // No match
    // ------------------------------------------------

    if (!matchedGame) {
      noMatch++;

      console.log(
        `OLD NORMALIZED PICK: ${oldPick}`
      );

      console.log("MATCH: NONE");

      console.log(
        ">>> NAME-MATCHING FAILURE CANDIDATE <<<"
      );

      continue;
    }

    if (matchMethod === "OLD NORMALIZATION") {
      oldMatch++;
    } else {
      aliasMatch++;
    }

    // ------------------------------------------------
    // Display matched ESPN information
    // ------------------------------------------------

    const homeName =
      matchedGame.home?.team?.displayName || "";

    const awayName =
      matchedGame.away?.team?.displayName || "";

    const homeShort =
      matchedGame.home?.team?.shortDisplayName || "";

    const awayShort =
      matchedGame.away?.team?.shortDisplayName || "";

    const winnerName =
      matchedGame.winner?.displayName || "";

    console.log(
      `Match method: ${matchMethod}`
    );

    console.log(
      `ESPN home: ${homeName}`
    );

    console.log(
      `ESPN home short: ${homeShort}`
    );

    console.log(
      `ESPN away: ${awayName}`
    );

    console.log(
      `ESPN away short: ${awayShort}`
    );

    console.log(
      `ESPN winner: ${winnerName || "NONE"}`
    );

    console.log(
      `Completed: ${matchedGame.completed}`
    );

    // ------------------------------------------------
    // Game not completed
    // ------------------------------------------------

    if (
      !matchedGame.completed ||
      !winnerName
    ) {
      console.log(
        "CALCULATED: PENDING"
      );

      continue;
    }

    // ------------------------------------------------
    // Calculate result using full names
    // ------------------------------------------------

    const fullNameResult =
      clean(winnerName) === clean(pick.team)
        ? "win"
        : "loss";

    // ------------------------------------------------
    // Calculate result using OLD normalization
    // ------------------------------------------------

    const oldWinner = oldNorm(
      matchedGame.winner?.shortDisplayName ||
        winnerName
    );

    const oldResult =
      oldWinner === oldPick
        ? "win"
        : "loss";

    console.log(
      `OLD NORMALIZED: ${oldPick} vs ${oldWinner} => ${oldResult}`
    );

    console.log(
      `FULL NAME:      ${pick.team} vs ${winnerName} => ${fullNameResult}`
    );

    // ------------------------------------------------
    // Detect disagreement
    // ------------------------------------------------

    if (oldResult !== fullNameResult) {
      disagreements++;

      console.log(
        ">>> OLD AND FULL-NAME LOGIC DISAGREE <<<"
      );
    }

    // ------------------------------------------------
    // Compare with currently stored result
    // ------------------------------------------------

    if (
      pick.result === "win" ||
      pick.result === "loss"
    ) {
      if (
        pick.result !== fullNameResult
      ) {
        console.log(
          ">>> STORED RESULT DIFFERS FROM FULL-NAME RESULT <<<"
        );
      }
    }
  }

  // ------------------------------------------------
  // Summary
  // ------------------------------------------------

  console.log("");
  console.log(
    "=================================================="
  );
  console.log("SUMMARY");
  console.log(
    "=================================================="
  );

  console.log(
    `Total Survivor picks: ${picks.length}`
  );

  console.log(
    `Old-method matches: ${oldMatch}`
  );

  console.log(
    `Full-name/alias-only matches: ${aliasMatch}`
  );

  console.log(
    `No matches: ${noMatch}`
  );

  console.log(
    `Old vs full-name disagreements: ${disagreements}`
  );

  console.log("");

  console.log(
    "NO DATABASE RECORDS WERE INSERTED, UPDATED, OR DELETED."
  );

  console.log(
    "=================================================="
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "DIAGNOSTIC ERROR:",
    error.message || error
  );
  process.exit(1);
});