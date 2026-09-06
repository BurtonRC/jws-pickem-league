import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/supabaseClient";

/*
 * ============================================================
 * LEAGUE RADAR — PRESENTATION ONLY
 * ============================================================
 *
 * This page consumes persisted Radar data.
 *
 * It does NOT:
 * - calculate Radar metrics
 * - determine archetype qualification
 * - recreate Radar thresholds
 * - calculate leaderboard movement
 * - calculate comeback state
 * - calculate Hot Hand
 * - calculate Dark Horse
 * - calculate Grinder
 * - calculate Contrarian
 *
 * All Radar decisions come from radar_weekly_results.
 *
 * The only logic below is presentation logic:
 * - formatting
 * - selecting which persisted flag to display
 * - deterministic dialogue wording
 * - modal state
 */

/* ============================================================
   FORMATTING
============================================================ */

function formatRadarNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "—";
  }

  return Number.isInteger(number)
    ? number.toLocaleString()
    : number.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
}

function formatRadarPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "—";
  }

  return `${number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function getInitials(username) {
  return (
    username
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function getProfileColor(userId) {
  const colors = [
    "#1683A3",
    "#8A4FB3",
    "#B06A32",
    "#3D9665",
    "#A84560",
    "#5574B5",
    "#9A8428",
    "#3D8F8F",
    "#D05A3A",
    "#3F8FC4",
    "#A64F91",
    "#5E9E3F",
    "#C07825",
    "#6A58B8",
    "#C04468",
    "#2E9A87",
    "#B34F35",
    "#4678C8",
    "#8B5BB5",
    "#7B9E32",
  ];

  if (!userId) return colors[0];

  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }

  return colors[hash % colors.length];
}

/* ============================================================
   ARCHETYPE EDUCATION
   These descriptions are presentation content only.
   The qualification rules themselves remain in Radar.
============================================================ */

const ARCHETYPES = [
  {
    key: "dark_horse",
    name: "DARK HORSE",
    image: "/images/radar/archetypes/dark-horse-256.png",
    color: "#a67be5",

    purpose:
      "Identify players who are outside the current top tier but are making a meaningful upward climb in league position.",

    qualification:
      "A player qualifies when their current league rank is outside the top 10, their position has improved from the previous week, and that climb is among the top 25% of the league for that week.",

    operating:
      "The label is recalculated weekly. Week 1 cannot receive a movement-based Dark Horse label because there is no previous league position."
  },

  {
    key: "grinder",
    name: "GRINDER",
    image: "/images/radar/archetypes/grinder-256.png",
    color: "#51645a",

    purpose:
      "Identify players showing sustained, low-variance performance over time.",

    qualification:
      "A player qualifies when rolling three-week variability is 1.50 or less and the player has at least three consistent weeks.",

    operating:
      "The Grinder begins effectively in Week 3 because three weeks of evidence are required. It measures steadiness rather than league rank or cumulative score."
  },

  {
    key: "hot_hand",
    name: "HOT HAND",
    image: "/images/radar/archetypes/hot-hand-256.png",
    color: "#bd3b17",

    purpose:
      "Identify players whose recent performance is improving while their current-week performance remains strong relative to the league.",

    qualification:
      "A player qualifies when improvement is in the league's top 25% and current-week support is also in the league's top 25%. Both conditions are required.",

    operating:
      "Hot Hand is recalculated each week. A player does not retain the label automatically after qualifying in a previous week. Week 1 receives no Hot Hand label."
  },

  {
    key: "comeback",
    name: "COMEBACK",
    image: "/images/radar/archetypes/comeback-256.png",
    color: "#68970a",

    purpose:
      "Identify a player who has suffered a substantial decline in league position and subsequently recovered a meaningful portion of that loss.",

    qualification:
      "A player must have declined at least 10 league positions and subsequently recovered at least 50% of that decline.",

    operating:
      "The historical Comeback event and the player's weekly Comeback label are kept separate. The label is recalculated weekly."
  },

  {
    key: "contrarian",
    name: "CONTRARIAN",
    image: "/images/radar/archetypes/contrarian-256.png",
    color: "#06a0bb",

    purpose:
      "Identify players who repeatedly succeed when making contrarian picks.",

    qualification:
      "A player qualifies when their current running contrarian win percentage is at least 50% and they have at least five qualifying weeks during the season.",

    operating:
      "The five qualifying weeks do not need to be consecutive. The archetype measures repeatable success with contrarian picks."
  }
];

/* ============================================================
   DIALOGUE
   Presentation filler only.
   It never determines whether a player qualifies.
============================================================ */

const RADAR_SITUATION_PRIORITY = [
  "NEW LEADER",
  "TOP SCORE",
  "BIGGEST CLIMB",
  "BIGGEST UPSET",
  "COMEBACK",
  "ON THE MOVE",
  "CLOSING THE GAP",
  "HOT HAND",
  "DARK HORSE",
  "GRINDER",
  "CONTRARIAN",
];

function getRadarSituation(player) {
  const flags = {
    "NEW LEADER": player?.new_leader,
    "TOP SCORE": player?.top_score,
    "BIGGEST CLIMB": player?.top_climber,
    "BIGGEST UPSET": player?.biggest_upset,
    "COMEBACK": player?.comeback,
    "ON THE MOVE": player?.on_the_move,
    "CLOSING THE GAP": player?.closing_the_gap,
    "HOT HAND": player?.hot_hand,
    "DARK HORSE": player?.dark_horse,
    "GRINDER": player?.grinder,
    "CONTRARIAN": player?.contrarian,
  };

  return (
    RADAR_SITUATION_PRIORITY.find(
      (situation) => flags[situation]
    ) || getGeneralRadarSituation(player)
  );
}


function getGeneralRadarSituation(player) {
  return "NEUTRAL";
}


const RADAR_DIALOGUE = {
    "NEW LEADER": {
        profile: [
            "New at the top.",
            "Now sitting first.",
            "The league leader.",
            "A new name at the summit.",
            "First place is yours this week.",
            "You moved all the way to the top.",
            "Now leading the league.",
            "A new number one.",
            "Taking charge at the top.",
            "The summit has a new occupant.",
        ],
        insight: [
            (p) => `${p.username} has taken over the league lead.`,
            (p) => `${p.username} moved into first place this week.`,
            (p) => `A new leader has emerged, with ${p.username} now sitting at the top.`,
            (p) => `${p.username} made the move that matters most — into first.`,
            (p) => `The top spot changed hands this week, and ${p.username} came out on top.`,
            (p) => `${p.username} has reached the top of the standings.`,
            (p) => `${p.username} is now the player everyone is chasing.`,
            (p) => `The lead belongs to ${p.username} this week.`,
            (p) => `${p.username} has moved from the chase to the front of the pack.`,
            (p) => `The leaderboard has a new name at number one: ${p.username}.`,
        ],
        highlight: [
            (p) => `${p.username} moved into first place.`,
            (p) => `A new leader at the top.`,
            (p) => `${p.username} takes over the lead.`,
            (p) => `First place changed hands.`,
            (p) => `${p.username} is now number one.`,
            (p) => `The lead has changed hands.`,
            (p) => `${p.username} reaches the summit.`,
            (p) => `A new number one emerges.`,
            (p) => `${p.username} takes the top spot.`,
            (p) => `The chase now starts from the top.`,
        ],
        history: [
            (p) => `Moved into first place in Week ${p.week}.`,
            (p) => `Took over the league lead in Week ${p.week}.`,
            (p) => `Reached the top of the leaderboard in Week ${p.week}.`,
            (p) => `New leader after Week ${p.week}.`,
            (p) => `Moved to the top in Week ${p.week}.`,
            (p) => `Claimed first place in Week ${p.week}.`,
            (p) => `Took the number one spot in Week ${p.week}.`,
            (p) => `Moved into the lead during Week ${p.week}.`,
            (p) => `Reached number one in Week ${p.week}.`,
            (p) => `The lead changed hands in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "A New Leader",
                text: `${p.username} moved into first place this week and now sits at the top of the league.`,
            }),
            (p) => ({
                title: "Taking the Lead",
                text: `The top spot changed hands in Week ${p.week}, with ${p.username} making the move into first.`,
            }),
            (p) => ({
                title: "At the Summit",
                text: `${p.username} has climbed all the way to the top of the leaderboard.`,
            }),
            (p) => ({
                title: "First Place",
                text: `${p.username} put together the week needed to take over the league lead.`,
            }),
            (p) => ({
                title: "New at the Top",
                text: `${p.username} has moved into first place and now leads the league.`,
            }),
            (p) => ({
                title: "The Lead Changes",
                text: `The leaderboard has a new number one, with ${p.username} taking the top spot.`,
            }),
            (p) => ({
                title: "Number One",
                text: `${p.username} has reached the top of the standings and is now the player to chase.`,
            }),
            (p) => ({
                title: "Leading the Pack",
                text: `${p.username} has moved from the chase to the front of the pack.`,
            }),
            (p) => ({
                title: "New at the Summit",
                text: `${p.username} has taken over first place in the league.`,
            }),
            (p) => ({
                title: "The Top Spot",
                text: `First place belongs to ${p.username} this week after a change at the top.`,
            }),
        ],
    },

    "TOP SCORE": {
        profile: [
            "The week's top scorer.",
            "A standout scoring week.",
            "Leading the scoring this week.",
            "The biggest score of the week.",
            "A week at the top of the scoring chart.",
            "Setting the weekly pace.",
            "The score to beat.",
            "Leading the week's scoring.",
            "Putting up the number to chase.",
            "Leading the weekly scoring.",
        ],
        insight: [
            (p) => `${p.username} posted the highest score in the league this week.`,
            (p) => `${p.username} led everyone in weekly scoring.`,
            (p) => `Nobody scored more than ${p.username} this week.`,
            (p) => `${p.username} produced the league's best weekly score.`,
            (p) => `The top weekly score belongs to ${p.username}.`,
            (p) => `${p.username} posted the week's top score.`,
            (p) => `${p.username} set the scoring benchmark this week.`,
            (p) => `${p.username} set the week's scoring high-water mark.`,
            (p) => `No one matched ${p.username}'s weekly score this time around.`,
            (p) => `${p.username} put together the week's standout scoring performance.`,
            (p) => `${p.username} came out on top in this week's scoring.`,
        ],
        highlight: [
            (p) => `${p.username} had the top score.`,
            (p) => `Highest score of the week.`,
            (p) => `${p.username} led the league in scoring.`,
            (p) => `The week's best score.`,
            (p) => `${p.username} had the week's top score.`,
            (p) => `Top score of the week.`,
            (p) => `${p.username} leads the week's scoring.`,
            (p) => `The week's scoring benchmark.`,
            (p) => `${p.username} set the pace in scoring.`,
            (p) => `Best score this week.`,
            (p) => `A scoring performance worth noting.`,
        ],
        history: [
            (p) => `Posted the league's top score in Week ${p.week}.`,
            (p) => `Led weekly scoring in Week ${p.week}.`,
            (p) => `Recorded the highest weekly score in Week ${p.week}.`,
            (p) => `Posted the top score in Week ${p.week}.`,
            (p) => `Led the league in scoring in Week ${p.week}.`,
            (p) => `Recorded the week's highest score in Week ${p.week}.`,
            (p) => `Set the scoring benchmark in Week ${p.week}.`,
            (p) => `Finished Week ${p.week} with the top score.`,
            (p) => `Produced the week's standout score in Week ${p.week}.`,
            (p) => `Finished Week ${p.week} with the league's top score.`,
        ],
        modal: [
            (p) => ({
                title: "Top Score",
                text: `${p.username} posted the highest weekly score in the league in Week ${p.week}.`,
            }),
            (p) => ({
                title: "Leading the Scoring",
                text: `${p.username} finished the week with the league's best score, putting together a standout performance.`,
            }),
            (p) => ({
                title: "Best of the Week",
                text: `Nobody scored more than ${p.username} this week.`,
            }),
            (p) => ({
                title: "Top of the Scores",
                text: `${p.username} put together the highest weekly score this week.`,
            }),
            (p) => ({
                title: "Setting the Pace",
                text: `${p.username} led the league in scoring this week.`,
            }),
            (p) => ({
                title: "Score to Beat",
                text: `${p.username} posted the week's top score and set the benchmark for everyone else.`,
            }),
            (p) => ({
                title: "Big Week",
                text: `${p.username} delivered the strongest scoring performance of the week.`,
            }),
            (p) => ({
                title: "At the Top",
                text: `${p.username} finished the week with more points than anyone else in the league.`,
            }),
            (p) => ({
                title: "The Weekly Benchmark",
                text: `${p.username} set the scoring mark that the rest of the league had to chase this week.`,
            }),
            (p) => ({
                title: "Top Scoring Week",
                text: `${p.username} finished the week with the highest score in the league.`,
            }),
        ],
    },

    "BIGGEST CLIMB": {
        profile: [
            "The week's biggest climber.",
            "Making the biggest move.",
            "A major move up the board.",
            "Climbing fast.",
            "The leaderboard is moving in your direction.",
            "The biggest leap of the week.",
            "Surging up the standings.",
            "Moving up in a hurry.",
            "The week's biggest riser.",
            "Making a serious move up.",
        ],
        insight: [
            (p) => `${p.username} made the biggest move up the leaderboard this week.`,
            (p) => `${p.username} surged up the standings more than anyone else this week.`,
            (p) => `Nobody gained more ground on the leaderboard than ${p.username}.`,
            (p) => `${p.username} made the week's biggest climb.`,
            (p) => `${p.username} made the biggest move up the standings this week.`,
            (p) => `${p.username} climbed more places than anyone else this week.`,
            (p) => `${p.username} was the league's biggest mover this week.`,
            (p) => `No one climbed further than ${p.username} this week.`,
            (p) => `${p.username} made the week's biggest jump up the leaderboard.`,
            (p) => `${p.username} made the strongest upward move of the week.`,
        ],
        highlight: [
            (p) => `${p.username} made the biggest climb.`,
            (p) => `The week's biggest move up.`,
            (p) => `A major jump on the leaderboard.`,
            (p) => `${p.username} gained serious ground.`,
            (p) => `${p.username} surged up the board.`,
            (p) => `Biggest move up this week.`,
            (p) => `${p.username} climbs the furthest.`,
            (p) => `The week's biggest riser.`,
            (p) => `${p.username} made the biggest jump.`,
            (p) => `A major move up the standings.`,
            (p) => `${p.username} made the week's biggest rise.`,
        ],
        history: [
            (p) => `Made the biggest leaderboard climb in Week ${p.week}.`,
            (p) => `The week's biggest move up came in Week ${p.week}.`,
            (p) => `Climbed more places than anyone else in Week ${p.week}.`,
            (p) => `Made the biggest climb in Week ${p.week}.`,
            (p) => `Moved up more places than anyone else in Week ${p.week}.`,
            (p) => `Recorded the week's biggest rise in Week ${p.week}.`,
            (p) => `Made the biggest move up the standings in Week ${p.week}.`,
            (p) => `Climbed further than anyone else in Week ${p.week}.`,
            (p) => `Was the league's biggest mover in Week ${p.week}.`,
            (p) => `Made the league's biggest upward move in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Biggest Climb",
                text: `${p.username} made the biggest move up the leaderboard in Week ${p.week}.`,
            }),
            (p) => ({
                title: "Making Ground",
                text: `${p.username} gained more leaderboard positions than anyone else this week.`,
            }),
            (p) => ({
                title: "A Big Move",
                text: `The leaderboard shifted in ${p.username}'s favor, producing the biggest climb of the week.`,
            }),
            (p) => ({
                title: "The Big Riser",
                text: `${p.username} climbed further up the leaderboard than anyone else this week.`,
            }),
            (p) => ({
                title: "Making a Move",
                text: `${p.username} climbed more places than anyone else this week.`,
            }),
            (p) => ({
                title: "On the Rise",
                text: `${p.username} made the week's biggest jump up the leaderboard.`,
            }),
            (p) => ({
                title: "Biggest Mover",
                text: `${p.username} was the league's biggest riser this week.`,
            }),
            (p) => ({
                title: "A Major Jump",
                text: `${p.username} made a significant move up the standings in Week ${p.week}.`,
            }),
            (p) => ({
                title: "Moving Up",
                text: `No one climbed further than ${p.username} this week.`,
            }),
            (p) => ({
                title: "Biggest Rise",
                text: `${p.username} made the strongest upward move of the week.`,
            }),
        ],
    },

    "BIGGEST UPSET": {
        profile: [
            "The week's biggest upset.",
            "A week-defining upset.",
            "A result nobody saw coming.",
            "The upset of the week.",
            "A surprise result worth remembering.",
            "Pulling off the unexpected.",
            "A result that changed the week.",
            "A shock result that stood out.",
            "Turning the odds upside down.",
            "A result that caught everyone off guard.",
        ],
        insight: [
            (p) => `${p.username} delivered the league's biggest upset this week.`,
            (p) => `${p.username} pulled off the biggest surprise result of the week.`,
            (p) => `The week's biggest upset belongs to ${p.username}.`,
            (p) => `${p.username} came through with a result that stood out from the crowd.`,
            (p) => `${p.username} produced the result that caught the league most off guard.`,
            (p) => `${p.username} turned an unexpected result into the week's biggest upset.`,
            (p) => `Few expected the result ${p.username} delivered this week.`,
            (p) => `${p.username} came away with the result that surprised the league most.`,
            (p) => `The most unexpected result of the week came from ${p.username}.`,
            (p) => `${p.username} turned a surprise into the standout result of the week.`,
        ],
        highlight: [
            (p) => `${p.username} delivered the biggest upset.`,
            (p) => `The week's biggest upset.`,
            (p) => `A major upset for ${p.username}.`,
            (p) => `The surprise result of the week.`,
            (p) => `An upset nobody expected.`,
            (p) => `${p.username} turned the odds upside down.`,
            (p) => `The result that caught everyone off guard.`,
            (p) => `${p.username} pulled off a shock result.`,
            (p) => `A surprise that defined the week.`,
            (p) => `The league didn't see this one coming.`,
        ],
        history: [
            (p) => `Recorded the biggest upset in Week ${p.week}.`,
            (p) => `Delivered the week's biggest surprise result in Week ${p.week}.`,
            (p) => `Biggest upset of Week ${p.week}.`,
            (p) => `Pulled off a major upset in Week ${p.week}.`,
            (p) => `Delivered an unexpected result in Week ${p.week}.`,
            (p) => `Produced the week's surprise result in Week ${p.week}.`,
            (p) => `Turned the odds upside down in Week ${p.week}.`,
            (p) => `Recorded a result few expected in Week ${p.week}.`,
            (p) => `Caught the league off guard in Week ${p.week}.`,
            (p) => `Pulled off the week's shock result in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Biggest Upset",
                text: `${p.username} delivered the league's biggest upset in Week ${p.week}.`,
            }),
            (p) => ({
                title: "Nobody Saw That Coming",
                text: `${p.username} came through with the biggest upset of the week.`,
            }),
            (p) => ({
                title: "A Surprise Result",
                text: `One of the week's most unexpected results came from ${p.username}.`,
            }),
            (p) => ({
                title: "Against the Odds",
                text: `${p.username} produced a result few expected and turned it into the week's biggest upset.`,
            }),
            (p) => ({
                title: "Caught Everyone Off Guard",
                text: `${p.username} delivered the result that surprised the league most this week.`,
            }),
            (p) => ({
                title: "A Shock Result",
                text: `${p.username} came through with an unexpected result that stood out from the rest of the week.`,
            }),
            (p) => ({
                title: "Turning the Odds",
                text: `${p.username} turned an unlikely result into the biggest upset of Week ${p.week}.`,
            }),
            (p) => ({
                title: "Unexpected",
                text: `Few saw this result coming, but ${p.username} delivered the week's biggest surprise.`,
            }),
            (p) => ({
                title: "The Upset of the Week",
                text: `${p.username} produced the result that caught the league most off guard.`,
            }),
            (p) => ({
                title: "Nobody Expected It",
                text: `${p.username} turned an unlikely outcome into the defining upset of the week.`,
            }),
        ],
    },

    "COMEBACK": {
        profile: [
            "The comeback continues.",
            "Still fighting back.",
            "The climb back is underway.",
            "A comeback worth watching.",
            "Not out of this yet.",
            "Back in the fight.",
            "Turning things around.",
            "Making a comeback.",
            "Refusing to stay down.",
            "Fighting their way back.",
        ],
        insight: [
            (p) => `${p.username}'s comeback continues this week.`,
            (p) => `${p.username} is still fighting back up the leaderboard.`,
            (p) => `The climb back continues for ${p.username}.`,
            (p) => `${p.username} continues to recover ground.`,
            (p) => `${p.username} is showing signs of a serious turnaround.`,
            (p) => `${p.username} has fought their way back into the picture.`,
            (p) => `${p.username} is making the kind of recovery that changes the story.`,
            (p) => `The comeback is gaining momentum for ${p.username}.`,
            (p) => `${p.username} is putting a difficult stretch behind them.`,
            (p) => `${p.username} is making a meaningful push back into contention.`,
        ],
        highlight: [
            (p) => `${p.username}'s comeback continues.`,
            (p) => `The comeback is still alive.`,
            (p) => `Still fighting back.`,
            (p) => `Another step in the comeback.`,
            (p) => `${p.username} is making a comeback.`,
            (p) => `A comeback is taking shape.`,
            (p) => `${p.username} is turning things around.`,
            (p) => `Back in the fight.`,
            (p) => `A strong recovery this week.`,
            (p) => `${p.username} is back in the picture.`,
            (p) => `${p.username} is fighting back.`,
        ],
        history: [
            (p) => `Comeback remained active in Week ${p.week}.`,
            (p) => `Continued the recovery in Week ${p.week}.`,
            (p) => `Another chapter in the comeback came in Week ${p.week}.`,
            (p) => `Started a comeback in Week ${p.week}.`,
            (p) => `Continued the turnaround in Week ${p.week}.`,
            (p) => `Made another step forward in Week ${p.week}.`,
            (p) => `The comeback continued in Week ${p.week}.`,
            (p) => `Showed signs of a turnaround in Week ${p.week}.`,
            (p) => `Moved back into the picture in Week ${p.week}.`,
            (p) => `Made another comeback move in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "The Comeback Continues",
                text: `${p.username} continues to recover ground after falling back earlier in the season.`,
            }),
            (p) => ({
                title: "Still Fighting",
                text: `${p.username}'s comeback remains active, with the leaderboard climb continuing.`,
            }),
            (p) => ({
                title: "Back in the Fight",
                text: `Another week has kept ${p.username}'s comeback moving in the right direction.`,
            }),
            (p) => ({
                title: "The Comeback",
                text: `${p.username} is putting together a turnaround and getting back into the picture.`,
            }),
            (p) => ({
                title: "Turning Things Around",
                text: `${p.username} has fought their way back and is starting to change the story.`,
            }),
            (p) => ({
                title: "A Strong Recovery",
                text: `${p.username} is showing the kind of recovery that can reshape the rest of the season.`,
            }),
            (p) => ({
                title: "A Turnaround",
                text: `${p.username} is putting a difficult stretch behind them and building momentum again.`,
            }),
            (p) => ({
                title: "Fighting Back",
                text: `${p.username} isn't staying down. The comeback is beginning to take shape.`,
            }),
            (p) => ({
                title: "Back in the Picture",
                text: `${p.username} has made another move in the right direction as the comeback continues.`,
            }),
            (p) => ({
                title: "Back Toward Contention",
                text: `${p.username} continues to work their way back into contention.`,
            }),
        ],
    },

    "ON THE MOVE": {
        profile: [
            "Moving up the board.",
            "Making progress.",
            "Gaining ground.",
            "Trending upward.",
            "The climb continues.",
            "Starting to move.",
            "Starting to gain momentum.",
            "Making a push up the standings.",
            "Finding some upward momentum.",
            "Beginning to make a noticeable move.",
        ],
        insight: [
            (p) => `${p.username} climbed the leaderboard this week.`,
            (p) => `${p.username} gained ground on the players ahead.`,
            (p) => `${p.username} is moving in the right direction.`,
            (p) => `The leaderboard is starting to move in ${p.username}'s favor.`,
            (p) => `${p.username} made another step forward this week.`,
            (p) => `${p.username} is beginning to make a noticeable move up the standings.`,
            (p) => `${p.username} is putting some distance between where they were and where they're headed.`,
            (p) => `${p.username} is beginning to make their presence felt higher on the leaderboard.`,
            (p) => `${p.username} is finding some upward momentum in the standings.`,
            (p) => `${p.username} is putting together a steady climb up the board.`,
        ],
        highlight: [
            (p) => `${p.username} moved up the board.`,
            (p) => `Gained ground this week.`,
            (p) => `Another move upward.`,
            (p) => `Trending in the right direction.`,
            (p) => `${p.username} is gaining momentum.`,
            (p) => `The climb is starting to show.`,
            (p) => `${p.username} is making a push upward.`,
            (p) => `A noticeable move up the standings.`,
            (p) => `${p.username} is gaining ground.`,
            (p) => `The upward trend continues.`,
        ],
        history: [
            (p) => `Moved up the leaderboard in Week ${p.week}.`,
            (p) => `Gained ground in Week ${p.week}.`,
            (p) => `Continued moving upward in Week ${p.week}.`,
            (p) => `Made progress up the standings in Week ${p.week}.`,
            (p) => `Started gaining momentum in Week ${p.week}.`,
            (p) => `Made a noticeable move upward in Week ${p.week}.`,
            (p) => `Continued the climb up the board in Week ${p.week}.`,
            (p) => `Made another move up the standings in Week ${p.week}.`,
            (p) => `Started gaining ground in Week ${p.week}.`,
            (p) => `Continued the upward trend in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Making Progress",
                text: `${p.username} climbed the leaderboard this week and is starting to gain ground on the players ahead.`,
            }),
            (p) => ({
                title: "Moving Up",
                text: `${p.username} put together another week that moved them in the right direction.`,
            }),
            (p) => ({
                title: "Gaining Ground",
                text: `${p.username} is making progress on the leaderboard, one week at a time.`,
            }),
            (p) => ({
                title: "Building Momentum",
                text: `${p.username} is starting to build momentum and move higher on the leaderboard.`,
            }),
            (p) => ({
                title: "A Move Up",
                text: `${p.username} is beginning to make a noticeable push up the standings.`,
            }),
            (p) => ({
                title: "Finding Ground",
                text: `${p.username} continues to gain ground and move in the right direction.`,
            }),
            (p) => ({
                title: "Trending Up",
                text: `${p.username} is finding some upward momentum as the leaderboard begins to shift.`,
            }),
            (p) => ({
                title: "The Climb",
                text: `${p.username} is putting together a steady climb up the leaderboard.`,
            }),
            (p) => ({
                title: "Making a Push",
                text: `${p.username} is beginning to make their presence felt higher on the board.`,
            }),
            (p) => ({
                title: "On the Rise",
                text: `${p.username} is gaining ground and starting to make a meaningful move upward.`,
            }),
        ],
    },

    "CLOSING THE GAP": {
        profile: [
            "Closing in.",
            "The gap is shrinking.",
            "Getting closer.",
            "Putting pressure on the player ahead.",
            "The chase is tightening.",
            "Making the player ahead nervous.",
            "Putting the player ahead under pressure.",
            "Chipping away at the deficit.",
            "Reducing the distance.",
            "Right behind the competition.",
        ],
        insight: [
            (p) => `${p.username} closed the gap on the player immediately ahead.`,
            (p) => `${p.username} is starting to put pressure on the player ahead.`,
            (p) => `The gap ahead of ${p.username} got smaller this week.`,
            (p) => `${p.username} is getting closer to the next spot.`,
            (p) => `${p.username} is steadily reducing the distance to the player ahead.`,
            (p) => `${p.username} is bringing the next position within reach.`,
            (p) => `${p.username} has the player ahead firmly in sight.`,
            (p) => `The separation between ${p.username} and the next spot continues to narrow.`,
            (p) => `${p.username} is making the position ahead increasingly reachable.`,
            (p) => `${p.username} continues to chip away at the deficit in front.`,
        ],
        highlight: [
            (p) => `${p.username} closed the gap.`,
            (p) => `The gap is getting smaller.`,
            (p) => `Putting pressure on the player ahead.`,
            (p) => `Closing in on the next spot.`,
            (p) => `${p.username} is right behind the competition.`,
            (p) => `The next position is coming into reach.`,
            (p) => `${p.username} is chipping away at the deficit.`,
            (p) => `The player ahead is firmly in sight.`,
            (p) => `${p.username} is narrowing the distance.`,
            (p) => `The chase is tightening around the next spot.`,
        ],
        history: [
            (p) => `Closed the gap in Week ${p.week}.`,
            (p) => `Moved closer to the player ahead in Week ${p.week}.`,
            (p) => `Cut into the gap in Week ${p.week}.`,
            (p) => `Reduced the distance to the next position in Week ${p.week}.`,
            (p) => `Made progress toward the next position in Week ${p.week}.`,
            (p) => `Continued to narrow the deficit in Week ${p.week}.`,
            (p) => `Put the player ahead under more pressure in Week ${p.week}.`,
            (p) => `Moved within closer range of the next position in Week ${p.week}.`,
            (p) => `Made the gap ahead increasingly manageable in Week ${p.week}.`,
            (p) => `Stayed within striking distance in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Closing In",
                text: `${p.username} closed the gap on the player immediately ahead this week.`,
            }),
            (p) => ({
                title: "Pressure Building",
                text: `${p.username} is getting closer to the next position and beginning to put pressure on the player ahead.`,
            }),
            (p) => ({
                title: "The Gap Is Shrinking",
                text: `The distance between ${p.username} and the next player on the leaderboard got smaller this week.`,
            }),
            (p) => ({
                title: "Within Reach",
                text: `${p.username} is bringing the next position increasingly within reach.`,
            }),
            (p) => ({
                title: "Chipping Away",
                text: `${p.username} continues to reduce the distance separating them from the player ahead.`,
            }),
            (p) => ({
                title: "The Chase Tightens",
                text: `${p.username} is putting increasing pressure on the position immediately ahead.`,
            }),
            (p) => ({
                title: "In Pursuit",
                text: `${p.username} has the next position firmly in sight and continues to close the distance.`,
            }),
            (p) => ({
                title: "Closing the Distance",
                text: `${p.username} is steadily reducing the deficit to the player ahead.`,
            }),
            (p) => ({
                title: "Right Behind",
                text: `${p.username} is moving into striking distance of the next position.`,
            }),
            (p) => ({
                title: "The Gap Narrows",
                text: `${p.username} continues to make the position ahead more reachable.`,
            }),
        ],
    },

    "HOT HAND": {
        profile: [
            "The hot streak continues.",
            "In strong form.",
            "Running hot.",
            "Recent form is holding.",
            "The momentum is real.",
            "Finding another gear.",
            "Playing with confidence.",
            "Keeping the streak alive.",
            "In a strong rhythm.",
            "Keeping the momentum going.",
            "Locked into a good run.",
        ],
        insight: [
            (p) => `${p.username} continues to show strong recent form.`,
            (p) => `${p.username} is carrying some serious momentum.`,
            (p) => `The recent run continues for ${p.username}.`,
            (p) => `${p.username} has kept the good weeks coming.`,
            (p) => `${p.username} is putting together another strong week.`,
            (p) => `${p.username} continues to ride a strong run of form.`,
            (p) => `${p.username} has found a rhythm that is producing results.`,
            (p) => `The momentum continues for ${p.username}.`,
            (p) => `${p.username} is keeping the good weeks coming.`,
            (p) => `${p.username} remains one of the league's hottest players.`,
        ],
        highlight: [
            (p) => `${p.username} is running hot.`,
            (p) => `Strong recent form continues.`,
            (p) => `The hot streak rolls on.`,
            (p) => `Momentum is building.`,
            (p) => `${p.username} keeps the hot streak going.`,
            (p) => `Another strong week for ${p.username}.`,
            (p) => `${p.username} is still running hot.`,
            (p) => `The hot hand continues.`,
            (p) => `${p.username} stays in rhythm.`,
            (p) => `The momentum keeps building.`,
        ],
        history: [
            (p) => `Continued the hot run in Week ${p.week}.`,
            (p) => `Strong form carried into Week ${p.week}.`,
            (p) => `Another strong week in the current run.`,
            (p) => `Kept the strong form going in Week ${p.week}.`,
            (p) => `Stayed in strong form through Week ${p.week}.`,
            (p) => `Kept the hot streak going in Week ${p.week}.`,
            (p) => `Another strong performance in Week ${p.week}.`,
            (p) => `Extended the run of good form in Week ${p.week}.`,
            (p) => `Maintained the momentum in Week ${p.week}.`,
            (p) => `Stayed hot in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Hot Hand",
                text: `${p.username} continues to put together strong recent weeks and is carrying plenty of momentum.`,
            }),
            (p) => ({
                title: "Running Hot",
                text: `The recent form hasn't cooled off for ${p.username}.`,
            }),
            (p) => ({
                title: "Momentum Building",
                text: `${p.username} has kept the good results coming and remains one of the league's hottest players.`,
            }),
            (p) => ({
                title: "Keeping It Going",
                text: `${p.username} continues to produce strong results and keep the momentum going.`,
            }),
            (p) => ({
                title: "In the Zone",
                text: `${p.username} has found a rhythm that is continuing to pay off.`,
            }),
            (p) => ({
                title: "Still Hot",
                text: `${p.username} is maintaining the strong form that has made this run stand out.`,
            }),
            (p) => ({
                title: "Good Form",
                text: `${p.username} continues to put together the kind of weeks that keep a hot streak alive.`,
            }),
            (p) => ({
                title: "Riding the Momentum",
                text: `${p.username} has carried the momentum into another strong week.`,
            }),
            (p) => ({
                title: "Another Strong Week",
                text: `${p.username} continues to find the results that have made this run so impressive.`,
            }),
            (p) => ({
                title: "The Run Continues",
                text: `${p.username} remains in a strong rhythm as the hot hand continues.`,
            }),
        ],
    },

    "DARK HORSE": {
        profile: [
            "One to watch.",
            "Quietly building momentum.",
            "A sleeper worth watching.",
            "Flying under the radar.",
            "The quiet threat.",
            "Quietly making an impact.",
            "An unlikely contender.",
            "Quietly entering contention.",
            "Finding value in unexpected places.",
            "Making a name without the spotlight.",
            "One to keep an eye on.",
        ],
        insight: [
            (p) => `${p.username} is quietly building a run worth watching.`,
            (p) => `${p.username} continues to make progress under the radar.`,
            (p) => `Don't overlook ${p.username}. The signs are starting to show.`,
            (p) => `${p.username} is putting together the kind of run that could matter later.`,
            (p) => `${p.username} is producing results without drawing much attention.`,
            (p) => `${p.username} continues to emerge as an unexpected threat.`,
            (p) => `${p.username} is quietly putting together a season worth watching.`,
            (p) => `The results are starting to make ${p.username} harder to overlook.`,
            (p) => `${p.username} is showing that strong results don't always come with a lot of noise.`,
            (p) => `${p.username} continues to surprise with results that are easy to overlook.`,
        ],
        highlight: [
            (p) => `${p.username} is one to watch.`,
            (p) => `A quiet threat is emerging.`,
            (p) => `Building something under the radar.`,
            (p) => `Don't overlook ${p.username}.`,
            (p) => `${p.username} keeps flying under the radar.`,
            (p) => `An unexpected rise for ${p.username}.`,
            (p) => `${p.username} is becoming harder to ignore.`,
            (p) => `Quietly getting results.`,
            (p) => `${p.username} is making an impact without the spotlight.`,
            (p) => `One to watch.`,
        ],
        history: [
            (p) => `Dark Horse status continued through Week ${p.week}.`,
            (p) => `Continued building quietly in Week ${p.week}.`,
            (p) => `Another under-the-radar week in Week ${p.week}.`,
            (p) => `Continued the quiet rise in Week ${p.week}.`,
            (p) => `Another unexpected result in Week ${p.week}.`,
            (p) => `Stayed under the radar while producing results in Week ${p.week}.`,
            (p) => `Continued to emerge as a dark horse in Week ${p.week}.`,
            (p) => `Added another strong result in Week ${p.week}.`,
            (p) => `Kept surprising the league in Week ${p.week}.`,
            (p) => `Quietly made an impact in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "One to Watch",
                text: `${p.username} is quietly building a run that could become much more important as the season develops.`,
            }),
            (p) => ({
                title: "Flying Under the Radar",
                text: `${p.username} may not be getting the most attention yet, but the underlying run is worth watching.`,
            }),
            (p) => ({
                title: "The Quiet Threat",
                text: `${p.username} continues to make progress without much noise — exactly what makes a Dark Horse interesting.`,
            }),
            (p) => ({
                title: "Under the Radar",
                text: `${p.username} continues to produce results without attracting much attention.`,
            }),
            (p) => ({
                title: "Emerging Contender",
                text: `${p.username} is quietly becoming a player the rest of the league may want to notice.`,
            }),
            (p) => ({
                title: "The Dark Horse",
                text: `${p.username} continues to put together results that make the dark horse label increasingly interesting.`,
            }),
            (p) => ({
                title: "Harder to Ignore",
                text: `The results are making ${p.username} increasingly difficult to overlook.`,
            }),
            (p) => ({
                title: "Quietly Rising",
                text: `${p.username} continues to make an impact without needing the spotlight.`,
            }),
            (p) => ({
                title: "Unexpected Threat",
                text: `${p.username} is emerging as a contender in a way that few may have expected.`,
            }),
            (p) => ({
                title: "Worth Watching",
                text: `${p.username} keeps producing the kind of results that make this dark horse worth keeping an eye on.`,
            }),
        ],
    },

    "GRINDER": {
        profile: [
            "Steady work is adding up.",
            "Consistency is the story.",
            "Grinding away.",
            "Quietly dependable.",
            "One week at a time.",
            "Steady and persistent.",
            "Grinding out the season.",
            "Quietly putting in the work.",
            "Built on consistency.",
            "Built for the long haul.",
        ],
        insight: [
            (p) => `${p.username} continues to put together a consistent run.`,
            (p) => `${p.username} is quietly grinding out another solid week.`,
            (p) => `Consistency continues to define ${p.username}'s season.`,
            (p) => `${p.username} keeps showing up and putting together steady results.`,
            (p) => `${p.username} continues to get results through steady, consistent play.`,
            (p) => `${p.username} keeps finding ways to stay competitive week after week.`,
            (p) => `There is nothing flashy about ${p.username}'s approach — just steady results.`,
            (p) => `${p.username} keeps grinding out results without needing a big moment.`,
            (p) => `Week after week, ${p.username} continues to find a way.`,
            (p) => `${p.username} continues to build results through persistence and consistency.`,
        ],
        highlight: [
            (p) => `${p.username} keeps grinding.`,
            (p) => `Consistency continues to show.`,
            (p) => `Another steady week.`,
            (p) => `Quietly getting the job done.`,
            (p) => `${p.username} keeps putting in the work.`,
            (p) => `Steady results continue.`,
            (p) => `${p.username} keeps finding a way.`,
            (p) => `Another solid week of grinding.`,
            (p) => `Consistency is paying off.`,
            (p) => `The grind continues.`,
            (p) => `${p.username} keeps grinding out results.`,
        ],
        history: [
            (p) => `Another steady week in Week ${p.week}.`,
            (p) => `Continued the consistent run in Week ${p.week}.`,
            (p) => `Grinding out another solid week.`,
            (p) => `Continued the steady grind in Week ${p.week}.`,
            (p) => `Another consistent week in Week ${p.week}.`,
            (p) => `Kept grinding out results in Week ${p.week}.`,
            (p) => `Stayed steady through Week ${p.week}.`,
            (p) => `Continued the run of consistent results in Week ${p.week}.`,
            (p) => `Another week of steady work in Week ${p.week}.`,
            (p) => `Kept the steady grind going in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Steady Work",
                text: `${p.username} continues to put together the kind of consistent performance that adds up over time.`,
            }),
            (p) => ({
                title: "One Week at a Time",
                text: `${p.username} keeps producing steady results without needing a spectacular week to stay relevant.`,
            }),
            (p) => ({
                title: "Quietly Dependable",
                text: `There is something to be said for showing up every week, and ${p.username} continues to do exactly that.`,
            }),
            (p) => ({
                title: "The Grind",
                text: `${p.username} keeps finding ways to produce steady results week after week.`,
            }),
            (p) => ({
                title: "No Flash Needed",
                text: `There is no need for fireworks here. ${p.username} continues to grind out results.`,
            }),
            (p) => ({
                title: "Keeping at It",
                text: `${p.username} continues to put together the kind of consistent weeks that keep a season moving forward.`,
            }),
            (p) => ({
                title: "Quiet Consistency",
                text: `${p.username} keeps finding a way to stay competitive without needing a standout moment.`,
            }),
            (p) => ({
                title: "Week by Week",
                text: `${p.username} continues to build on steady results, one week at a time.`,
            }),
            (p) => ({
                title: "Still Grinding",
                text: `${p.username} keeps showing up and getting results. The grind continues.`,
            }),
            (p) => ({
                title: "Built to Last",
                text: `${p.username} continues to rely on persistence and consistency to keep producing results.`,
            }),
        ],
    },

    "CONTRARIAN": {
        profile: [
            "Taking the road less traveled.",
            "Going against the crowd.",
            "Seeing things differently.",
            "The contrarian route is working.",
            "Not following the crowd.",
            "Choosing the less obvious path.",
            "Taking the other route.",
            "Seeing it differently.",
            "Finding value away from the crowd.",
            "Finding success on a different path.",
        ],
        insight: [
            (p) => `${p.username} continues to find success with contrarian picks.`,
            (p) => `${p.username} is taking a different route from much of the league.`,
            (p) => `Going against the crowd continues to pay off for ${p.username}.`,
            (p) => `${p.username} keeps finding value where others aren't looking.`,
            (p) => `${p.username} continues to find value by going against the crowd.`,
            (p) => `${p.username} is finding success by trusting a different read than most of the league.`,
            (p) => `The crowd isn't always right, and ${p.username} is proving it.`,
            (p) => `${p.username} keeps finding opportunities where others aren't looking.`,
            (p) => `Going their own way continues to work for ${p.username}.`,
            (p) => `${p.username} continues to trust a different read of the games.`,
        ],
        highlight: [
            (p) => `${p.username} went against the crowd.`,
            (p) => `The contrarian route is working.`,
            (p) => `Seeing the games differently.`,
            (p) => `Going their own way — successfully.`,
            (p) => `${p.username} took the road less traveled.`,
            (p) => `The different approach is paying off.`,
            (p) => `${p.username} is seeing the games differently.`,
            (p) => `Another contrarian call pays off.`,
            (p) => `The road less traveled is working.`,
            (p) => `Success away from the crowd.`,
            (p) => `${p.username} found another way to beat the crowd.`,
        ],
        history: [
            (p) => `Continued the contrarian run in Week ${p.week}.`,
            (p) => `Found success going against the crowd in Week ${p.week}.`,
            (p) => `Another successful contrarian week.`,
            (p) => `Found another successful path in Week ${p.week}.`,
            (p) => `Another week of beating the consensus in Week ${p.week}.`,
            (p) => `Went against the crowd again in Week ${p.week}.`,
            (p) => `Found value away from the consensus in Week ${p.week}.`,
            (p) => `Took a different route in Week ${p.week}.`,
            (p) => `Continued finding success outside the crowd in Week ${p.week}.`,
            (p) => `Found another successful route away from the crowd in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Taking a Different Route",
                text: `${p.username} continues to find success by going against the more popular picks.`,
            }),
            (p) => ({
                title: "Against the Crowd",
                text: `${p.username} isn't following the crowd, and the results continue to justify the approach.`,
            }),
            (p) => ({
                title: "Seeing It Differently",
                text: `${p.username} keeps finding opportunities where the rest of the league is looking elsewhere.`,
            }),
            (p) => ({
                title: "Against the Consensus",
                text: `${p.username} is taking a different path from the popular picks, and the results continue to justify it.`,
            }),
            (p) => ({
                title: "A Different Angle",
                text: `${p.username} keeps finding opportunities by looking at the games from another angle.`,
            }),
            (p) => ({
                title: "The Other Route",
                text: `${p.username} is taking a different path from the crowd — and it is paying off.`,
            }),
            (p) => ({
                title: "Going Their Own Way",
                text: `${p.username} continues to trust a different read of the games, with results to show for it.`,
            }),
            (p) => ({
                title: "Away From the Crowd",
                text: `${p.username} found success by taking a route that much of the league didn't.`,
            }),
            (p) => ({
                title: "The Contrarian Route",
                text: `${p.username} continues to find value by looking beyond the consensus.`,
            }),
            (p) => ({
                title: "A Different Read",
                text: `${p.username} continues to find success by seeing the games differently from the crowd.`,
            }),
        ],
    },

    "STRONG WEEK": {
        profile: [
            "A strong week on the board.",
            "A week worth noticing.",
            "Putting together a good one.",
            "A solid week.",
            "A week of solid progress.",
            "Putting together a productive week.",
            "A dependable performance.",
            "A week that moved things forward.",
            "Building on a good run.",
            "Another week of positive results.",
        ],
        insight: [
            (p) => `${p.username} put together a strong week.`,
            (p) => `${p.username} had a week that moved things in the right direction.`,
            (p) => `A solid performance from ${p.username} this week.`,
            (p) => `${p.username} delivered another dependable performance this week.`,
            (p) => `${p.username} put together a week of positive results.`,
            (p) => `${p.username} had a productive week on the leaderboard.`,
            (p) => `${p.username} built on their recent form with another solid performance.`,
            (p) => `${p.username} turned in a performance that kept things moving forward.`,
            (p) => `${p.username} came through with another week of positive results.`,
            (p) => `${p.username} had a productive week and continued building momentum.`,
        ],
        highlight: [
            (p) => `${p.username} had a strong week.`,
            (p) => `A solid week on the board.`,
            (p) => `A week worth noticing.`,
            (p) => `${p.username} put together a good one.`,
            (p) => `Another solid performance.`,
            (p) => `${p.username} had a productive week.`,
            (p) => `A dependable week from ${p.username}.`,
            (p) => `Positive results for ${p.username}.`,
            (p) => `${p.username} keeps building.`,
            (p) => `Another week moving in the right direction.`,
        ],
        history: [
            (p) => `Strong week in Week ${p.week}.`,
            (p) => `Put together a solid Week ${p.week}.`,
            (p) => `Delivered a solid performance in Week ${p.week}.`,
            (p) => `Put together a good week in Week ${p.week}.`,
            (p) => `Recorded another positive week in Week ${p.week}.`,
            (p) => `Had a productive Week ${p.week}.`,
            (p) => `Turned in a dependable performance in Week ${p.week}.`,
            (p) => `Built on recent form in Week ${p.week}.`,
            (p) => `Kept things moving in the right direction in Week ${p.week}.`,
            (p) => `Added another solid result in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "A Strong Week",
                text: `${p.username} put together a solid performance this week.`,
            }),
            (p) => ({
                title: "Good Week",
                text: `${p.username} had a week that moved things in a positive direction.`,
            }),
            (p) => ({
                title: "Solid Performance",
                text: `${p.username} delivered another dependable performance and kept things moving in the right direction.`,
            }),
            (p) => ({
                title: "Moving Forward",
                text: `${p.username} put together a productive week that keeps the season moving positively.`,
            }),
            (p) => ({
                title: "Another Good Week",
                text: `${p.username} followed up with another solid performance on the board.`,
            }),
            (p) => ({
                title: "Positive Results",
                text: `${p.username} came through with a week that produced another set of encouraging results.`,
            }),
            (p) => ({
                title: "Building on It",
                text: `${p.username} is building on recent form with another dependable performance.`,
            }),
            (p) => ({
                title: "A Productive Week",
                text: `${p.username} put together a week that continued to move things forward.`,
            }),
            (p) => ({
                title: "Keeping It Going",
                text: `${p.username} continues to put together solid weeks and keep things moving in the right direction.`,
            }),
            (p) => ({
                title: "Good Progress",
                text: `${p.username} added another positive performance to the season this week.`,
            }),
        ],
    },

    "DIFFICULT WEEK": {
        profile: [
            "A tougher week.",
            "A difficult one.",
            "Not the week they wanted.",
            "A rough patch this week.",
            "A week that didn't go to plan.",
            "A step backward this week.",
            "A frustrating week.",
            "A week to put behind them.",
            "Things didn't quite click this week.",
            "A setback on the board.",
        ],
        insight: [
            (p) => `${p.username} had a difficult week.`,
            (p) => `${p.username} ran into a tougher week on the board.`,
            (p) => `It was a challenging week for ${p.username}.`,
            (p) => `${p.username} came through a week that proved more difficult than expected.`,
            (p) => `${p.username} saw their progress stall this week.`,
            (p) => `${p.username} had a week that did not quite come together.`,
            (p) => `${p.username} took a step backward on the leaderboard this week.`,
            (p) => `${p.username} endured a frustrating week on the board.`,
            (p) => `Things did not quite click for ${p.username} this week.`,
            (p) => `${p.username} will be looking to put this week's results behind them.`,
        ],
        highlight: [
            (p) => `${p.username} had a tough week.`,
            (p) => `A difficult week on the board.`,
            (p) => `A rough one this week.`,
            (p) => `A week that didn't go to plan.`,
            (p) => `${p.username} takes a step back.`,
            (p) => `A frustrating week.`,
            (p) => `A setback on the board.`,
            (p) => `Things didn't quite click.`,
            (p) => `A week to put behind them.`,
            (p) => `${p.username} hit a rough patch.`,
        ],
        history: [
            (p) => `Difficult week in Week ${p.week}.`,
            (p) => `A tougher Week ${p.week}.`,
            (p) => `Ran into a difficult stretch in Week ${p.week}.`,
            (p) => `Had a challenging week in Week ${p.week}.`,
            (p) => `Saw progress stall in Week ${p.week}.`,
            (p) => `Took a step backward in Week ${p.week}.`,
            (p) => `Endured a frustrating Week ${p.week}.`,
            (p) => `Had a week that did not go to plan in Week ${p.week}.`,
            (p) => `Hit a rough patch in Week ${p.week}.`,
            (p) => `Put a difficult week behind them in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "A Difficult Week",
                text: `${p.username} had a tougher week, but there is still plenty of season left.`,
            }),
            (p) => ({
                title: "A Rough One",
                text: `Week ${p.week} did not go the way ${p.username} would have wanted.`,
            }),
            (p) => ({
                title: "A Tough Stretch",
                text: `${p.username} ran into a more difficult stretch this week, with progress taking a step back.`,
            }),
            (p) => ({
                title: "A Step Back",
                text: `${p.username} saw their progress stall on the leaderboard this week.`,
            }),
            (p) => ({
                title: "Not Their Week",
                text: `Things did not quite come together for ${p.username} in Week ${p.week}.`,
            }),
            (p) => ({
                title: "A Setback",
                text: `${p.username} took a step backward this week, but the season is far from over.`,
            }),
            (p) => ({
                title: "Rough Patch",
                text: `${p.username} hit a rough patch on the board this week.`,
            }),
            (p) => ({
                title: "Putting It Behind Them",
                text: `${p.username} had a frustrating week and will be looking to bounce back from it.`,
            }),
            (p) => ({
                title: "A Challenging Week",
                text: `${p.username} faced a tougher week than expected, but there is still plenty of time to respond.`,
            }),
            (p) => ({
                title: "Reset and Go Again",
                text: `Week ${p.week} was difficult for ${p.username}, but one tough week does not define the season.`,
            }),
        ],
    },

    "NEUTRAL": {
        profile: [
            "Another week in the books.",
            "The season moves on.",
            "Another week down.",
            "Still in the fight.",
            "Another week completed.",
            "Steady progress through the season.",
            "Keeping the season moving.",
            "Another step through the schedule.",
            "The season continues.",
            "Keeping pace with the season.",
        ],
        insight: [
            (p) => `${p.username} completed another week of the season.`,
            (p) => `Another week is in the books for ${p.username}.`,
            (p) => `${p.username} continues through the season.`,
            (p) => `${p.username} moved through another week of the season.`,
            (p) => `${p.username} continues to work through the season.`,
            (p) => `${p.username} remains in the mix as another week comes to a close.`,
            (p) => `Another week of the season is complete for ${p.username}.`,
            (p) => `${p.username} keeps moving forward as the season continues.`,
            (p) => `${p.username} remains in the fight with another week completed.`,
            (p) => `The season continues to unfold for ${p.username}.`,
        ],
        highlight: [
            (p) => `Another week in the books.`,
            (p) => `The season moves on.`,
            (p) => `Another week down.`,
            (p) => `Another week completed.`,
            (p) => `Still in the mix.`,
            (p) => `Keeping the season moving.`,
            (p) => `${p.username} keeps moving forward.`,
            (p) => `Another step through the season.`,
            (p) => `Still in the fight.`,
            (p) => `The season continues.`,
        ],
        history: [
            (p) => `Completed Week ${p.week}.`,
            (p) => `Another week in the books — Week ${p.week}.`,
            (p) => `Completed another week in Week ${p.week}.`,
            (p) => `Moved through another week in Week ${p.week}.`,
            (p) => `Kept the season moving in Week ${p.week}.`,
            (p) => `Another week completed in Week ${p.week}.`,
            (p) => `Stayed in the mix through Week ${p.week}.`,
            (p) => `Continued through the season in Week ${p.week}.`,
            (p) => `Kept pace with the season in Week ${p.week}.`,
            (p) => `Moved another step through the season in Week ${p.week}.`,
        ],
        modal: [
            (p) => ({
                title: "Another Week in the Books",
                text: `${p.username} completed Week ${p.week} and remains in the fight as the season moves forward.`,
            }),
            (p) => ({
                title: "The Season Moves On",
                text: `Week ${p.week} is complete, with ${p.username}'s season continuing.`,
            }),
            (p) => ({
                title: "Another Week Complete",
                text: `${p.username} worked through another week as the season continues to move forward.`,
            }),
            (p) => ({
                title: "Keeping It Moving",
                text: `${p.username} completed another week and remains in the mix as the season continues.`,
            }),
            (p) => ({
                title: "Still in the Fight",
                text: `${p.username} remains in the fight with another week now in the books.`,
            }),
            (p) => ({
                title: "Another Step",
                text: `${p.username} moved through another week as the season continues to unfold.`,
            }),
            (p) => ({
                title: "Season in Motion",
                text: `Another week is complete for ${p.username}, with the season continuing to move forward.`,
            }),
            (p) => ({
                title: "Keeping Pace",
                text: `${p.username} continues through the season with another week completed.`,
            }),
            (p) => ({
                title: "Still in the Mix",
                text: `${p.username} remains part of the race as another week comes to a close.`,
            }),
            (p) => ({
                title: "Week Complete",
                text: `${p.username} has another week behind them as the season moves on.`,
            }),
        ],
    },
};

function getRadarDialogue(
  player,
  surface = "modal",
  situation = null
) {
  situation = situation || getRadarSituation(player);
  const choices = RADAR_DIALOGUE[situation]?.[surface];

  if (!choices?.length) return null;

  const seed = `${player.user_id}-${player.week}-${surface}`;

  const index =
    [...seed].reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0
    ) % choices.length;

  const choice = choices[index];

  return typeof choice === "function"
    ? choice(player)
    : choice;
}

/* ============================================================
   PRESENTATION MAPPING
   Reads persisted Radar flags.
   Does not recreate any Radar rule.
============================================================ */

function getHighlightItems(player) {
  const items = [];

  if (player.top_score) {
    items.push({
      type: "TOP SCORE",
      description: `${formatRadarNumber(
        player.weekly_score
      )} points this week.`,
      value: `#${player.league_rank}`,
      sort: 1,
    });
  }

  if (player.hot_week) {
    items.push({
      type: "HOT WEEK",
      description: `${formatRadarNumber(
        player.weekly_score
      )} points this week.`,
      value: `#${player.league_rank}`,
      sort: 2,
    });
  }

  if (player.new_leader) {
    items.push({
      type: "NEW LEADER",
      description: "Moved into first place in the league.",
      value: "#1",
      sort: 3,
    });
  }

  if (player.top_climber) {
    const movement = Math.abs(
      Number(player.rank_change || 0)
    );

    items.push({
      type: "BIGGEST CLIMB",
      description: `Moved up ${movement} ${
        movement === 1 ? "place" : "places"
      } this week.`,
      value: `#${player.league_rank}`,
      sort: 4,
    });
  }

  if (player.on_the_move) {
    const movement = Math.abs(
      Number(player.rank_change || 0)
    );

    items.push({
      type: "ON THE MOVE",
      description: `Moved up ${movement} ${
        movement === 1 ? "place" : "places"
      } this week.`,
      value: `#${player.league_rank}`,
      sort: 5,
    });
  }

  if (player.closing_the_gap) {
    items.push({
      type: "CLOSING THE GAP",
      description:
        player.gap_closed !== null &&
        player.gap_closed !== undefined
          ? `Closed ${formatRadarNumber(
              player.gap_closed
            )} points on the player ahead.`
          : "Closed ground on the player ahead.",
      value: `#${player.league_rank}`,
      sort: 6,
    });
  }

  if (player.dark_horse) {
  const archetype = getArchetypeByLabel("DARK HORSE");

  items.push({
    type: "DARK HORSE",
    archetype,
    description: "Working hard in the background.",
    value: `#${player.league_rank}`,
    sort: 7,
  });
}

if (player.grinder) {
  const archetype = getArchetypeByLabel("GRINDER");

  items.push({
    type: "GRINDER",
    archetype,
    description: "Grinding out results week after week.",
    value: `#${player.league_rank}`,
    sort: 8,
  });
}

if (player.hot_hand) {
  const archetype = getArchetypeByLabel("HOT HAND");

  items.push({
    type: "HOT HAND",
    archetype,
    description: "Finding the right answers at the right time.",
    value: `#${player.league_rank}`,
    sort: 9,
  });
}

if (player.comeback) {
  const archetype = getArchetypeByLabel("COMEBACK");

  items.push({
    type: "COMEBACK",
    archetype,
    description: "Turning things around when it mattered.",
    value: `#${player.league_rank}`,
    sort: 10,
  });
}

if (player.contrarian) {
  const archetype = getArchetypeByLabel("CONTRARIAN");

  items.push({
    type: "CONTRARIAN",
    archetype,
    description: "Finding value away from the crowd.",
    value: `#${player.league_rank}`,
    sort: 11,
  });
}

  if (player.biggest_upset) {
    const count = Number(
      player.biggest_upset_count || 0
    );

    items.push({
      type: "BIGGEST UPSET",
      
      description:
        count > 0
          ? `${count} ${
              count === 1 ? "upset pick" : "upset picks"
            } this week.`
          : "Delivered the week's biggest upset.",
      value: `#${player.league_rank}`,
      sort: 8,
    });
  }

  return items.sort((a, b) => a.sort - b.sort);
}

/* ============================================================
   ACHIEVEMENT ICONS & LABELS
   Presentation only.
============================================================ */

const ACHIEVEMENT_ICONS = {
  "TOP SCORE": "/images/radar/achievements/top-score-256.png",
  "HOT WEEK": "/images/radar/achievements/hot-week-256.png",
  "NEW LEADER": "/images/radar/achievements/leader-256.png",
  "BIGGEST CLIMB": "/images/radar/achievements/top-climber-256.png",
  "ON THE MOVE": "/images/radar/achievements/on-the-move-256.png",
  "CLOSING THE GAP":
    "/images/radar/achievements/closing-the-gap-256.png",
  "BIGGEST UPSET": "/images/radar/achievements/biggest-upset-256.png",
};

const ACHIEVEMENT_LABEL_COLORS = {
  "TOP SCORE": "bg-[#45391a] border-[#64521f] text-[#f4cc0b]",
  "HOT WEEK": "bg-[#5a2211] border-[#792609] text-[#f4cc0b]",
  "NEW LEADER": "bg-[#679264] border-[#8aae87] text-[#ededed]",
  "BIGGEST CLIMB": "bg-[#103a1e] border-[#2f7e30] text-[#68c385]",
  "ON THE MOVE": "bg-[#013054] border-[#005186] text-[#13b5fc]",
  "CLOSING THE GAP": "bg-[#c52a9d] border-[#ea4fc2] text-[#ededed]",
  "BIGGEST UPSET": "bg-[#d2020a] border-[#f91a1e] text-[#ededed]",
};

/* ============================================================
   ACHIEVEMENT ICON
============================================================ */

function AchievementIcon({
  type,
  size = "normal",
}) {
  const image = ACHIEVEMENT_ICONS[type];

  if (!image) return null;

  const dimension =
    size === "small"
      ? "h-8 w-8"
      : "h-10 w-10";

  return (
    <div
      className={`${dimension} inline-flex shrink-0 items-center justify-center`}
      aria-hidden="true"
    >
      <img
        src={image}
        alt=""
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/* ============================================================
   ARCHETYPE ICON
============================================================ */

function ArchetypeIcon({
  archetype,
  onClick,
  size = "normal",
}) {
  const dimension =
    size === "small"
      ? "h-8 w-8"
      : "h-10 w-10";

  return (
    <button
      type="button"
      onClick={onClick}
      title={archetype.name}
      aria-label={`Learn about ${archetype.name}`}
      className={`${dimension} inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition hover:scale-105 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-400/60`}
    >
      <img
        src={archetype.image}
        alt=""
        className="h-full w-full object-contain"
      />
    </button>
  );
}

/* ============================================================
   ARCHETYPE EDUCATION MODAL
============================================================ */

function titleCaseArchetype(value) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getArchetypeByLabel(label) {
  if (!label) return null;

  return (
    ARCHETYPES.find(
      (archetype) => archetype.name === label
    ) || null
  );
}

function ArchetypeModal({ archetype, onClose }) {
  if (!archetype) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="
          relative
          w-full max-w-[760px]
          max-h-[90vh]
          overflow-y-auto
          rounded-lg
          border border-[#8fa9bb]
          bg-[#b2c7d8]
          shadow-2xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            absolute right-4 top-3
            z-10
            text-sm font-semibold
            text-[#071c2b]
            hover:text-black
          "
        >
          ×
        </button>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[180px_1fr] sm:p-10">

          {/* =====================================================
              ARCHETYPE DISPLAY
          ===================================================== */}
          <div
            className="
              flex
              min-h-[220px]
              flex-col
              items-center
              justify-center
              rounded-md
              border-2
              border-[#587589]
              bg-[#001b2a]
              px-4 py-5
              shadow-inner
            "
          >
            <img
  src={archetype.image}
  alt=""
  className="h-28 w-28 object-contain sm:h-32 sm:w-32"
/>

            <div className="mt-4 text-center">
              <div className="text-[15px] font-semibold leading-tight text-[#b2c7d8]">
                THE
              </div>

              <div
                className="mt-1 text-[23px] font-extrabold leading-tight"
                style={{ color: archetype.color }}
              >
                {archetype.name}
              </div>
            </div>
          </div>

          {/* =====================================================
              EDUCATIONAL CONTENT
          ===================================================== */}
          <div className="min-w-0 text-[#102333]">

            <div className="pr-7 text-[14px] font-bold tracking-wide sm:text-[15px]">
              LEAGUE ARCHETYPES
              <span
                className="ml-2"
                style={{ color: archetype.color }}
              >
                {titleCaseArchetype(archetype.name)}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-[12px] font-bold">
                Purpose
              </div>

              <p className="mt-1 text-[12px] leading-[1.35]">
                {archetype.purpose}
              </p>
            </div>

            <div className="mt-4">
              <div className="text-[12px] font-bold">
                Qualification
              </div>

              <p className="mt-1 text-[12px] leading-[1.35]">
                {archetype.qualification}
              </p>
            </div>

            <div className="mt-4">
              <div className="text-[12px] font-bold">
                Operating rules
              </div>

              <p className="mt-1 text-[12px] leading-[1.35]">
                {archetype.operating}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PLAYER MODAL
============================================================ */

function PlayerModal({
  player,
  onClose,
}) {

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

    useEffect(() => {
    if (!player?.user_id || !player?.season) return;

    let mounted = true;

    const loadComments = async () => {
      setCommentsLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("comments_with_username")
        .select("*")
        .eq("radar_player_user_id", player.user_id)
        .eq("radar_season", player.season)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Radar comments load failed:", error);
        setComments([]);
      } else {
        setComments(data || []);
      }

      setCommentsLoading(false);
    };

    loadComments();

    return () => {
      mounted = false;
    };
  }, [player?.user_id, player?.season]);

    const handleAddComment = async () => {
    const content = commentText.trim();

    if (!content || !player?.user_id || !player?.season) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      console.error("Unable to determine current user.");
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        content,
        radar_player_user_id: player.user_id,
        radar_season: player.season,
      });

    if (error) {
      console.error("Radar comment post failed:", error);
      return;
    }

    setCommentText("");

    const { data, error: reloadError } = await supabase
      .from("comments_with_username")
      .select("*")
      .eq("radar_player_user_id", player.user_id)
      .eq("radar_season", player.season)
      .order("created_at", { ascending: true });

    if (reloadError) {
      console.error("Radar comments reload failed:", reloadError);
      return;
    }

    setComments(data || []);
  };
  
  if (!player) return null;

  const story = getRadarDialogue(player, "modal");

  

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-cyan-700/80 bg-[#07566A] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[#023343] bg-[#03455b] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              {player.username}
            </h2>

            <div className="mt-1 text-xs text-cyan-100 sm:text-sm">
              Week {player.week} · League Rank #{player.league_rank}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 text-2xl leading-none text-white/80 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {/* STORY */}
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-widest text-white sm:text-sm">
              THIS WEEK'S STORY
            </h3>

            <div className="rounded-lg border border-cyan-300/70 bg-[#0b6176] px-5 py-4">
              <h4 className="text-base font-medium text-white sm:text-lg">
                {story.title}
              </h4>

              <p className="mt-2 text-sm leading-6 text-cyan-50">
                {story.text}
              </p>
            </div>
          </section>

          {/* RADAR */}
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-widest text-white sm:text-sm">
              RADAR
            </h3>

            <div className="rounded-lg border border-cyan-300/50 bg-[#064c61] px-5 py-4">
              {player.primary_label ? (
  <>
                    <div className="flex items-center gap-2">
                    {getArchetypeByLabel(player.primary_label) && (
                        <img
                        src={
                            getArchetypeByLabel(
                            player.primary_label
                            ).image
                        }
                        alt=""
                        className="h-7 w-7 shrink-0 object-contain"
                        />
                    )}

                    <div className="text-sm font-semibold text-white">
                        {player.primary_label}
                    </div>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-cyan-50">
                    This was the player's persisted primary Radar story
                    for Week {player.week}.
                    </p>
                </>
                ) : (
                <p className="text-sm leading-6 text-cyan-50">
                  No primary Radar event was recorded for this week.
                </p>
              )}
            </div>
          </section>

          {/* COMMENTS */}
          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-widest text-white sm:text-sm">
              COMMENTS
            </h3>

            <div className="border-t border-cyan-200/60">
<div className="space-y-3">
  {commentsLoading ? (
    <div className="text-sm text-cyan-100/70">
      Loading comments...
    </div>
  ) : comments.length === 0 ? (
    <div className="text-sm text-cyan-100/70">
      No comments yet.
    </div>
  ) : (
    comments.map((comment) => (
      <div
        key={comment.id}
        className="border-b border-white/20 pb-3 last:border-b-0"
      >
        <div className="text-sm font-semibold text-white">
          {comment.username || "Unknown"}
        </div>
        <div className="mt-1 text-sm text-cyan-100">
          {comment.content}
        </div>
      </div>
    ))
  )}

  <div className="flex gap-2 pt-1">
    <input
      type="text"
      value={commentText}
      onChange={(e) => setCommentText(e.target.value)}
      placeholder="Add a comment..."
      className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/80 px-3 py-2 text-sm text-slate-800 placeholder-slate-500 outline-none"
    />

    <button
      type="button"
      onClick={handleAddComment}
      disabled={!commentText.trim()}
      className="rounded-md border border-cyan-100/60 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
    >
      Post
    </button>
  </div>
</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function LeagueRadarPage() {
  const [radarData, setRadarData] = useState([]);
  
  const [profileHistory, setProfileHistory] = useState([]);

  const [season, setSeason] = useState(null);
  const [week, setWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedArchetype, setSelectedArchetype] =
    useState(null);
  
    // TEMPORARY DEMO SWITCH — remove after the 2025 demonstration
  const DEMO_MODE = false;
  const DEMO_SEASON = 2025;
  const DEMO_MAX_WEEK = 8;

  const DEFAULT_SEASON = 2026;
  const DEFAULT_WEEK = 1;

  /* ============================================================
     DATA LOAD
     ============================================================ */

  useEffect(() => {
    let mounted = true;

    const loadRadar = async () => {
      setLoading(true);
      setError(null);

      try {
        /* --------------------------------------------------------
           Current authenticated user
        -------------------------------------------------------- */

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error(
            "Unable to determine the current user."
          );
        }

        if (!mounted) return;

        setCurrentUserId(user.id);

        /* --------------------------------------------------------
           Most recent published Radar week
        -------------------------------------------------------- */
        /* --------------------------------------------------------
           Radar season / week
        -------------------------------------------------------- */

        let radarSeason = DEFAULT_SEASON;
        let radarWeek = DEFAULT_WEEK;

        if (DEMO_MODE) {
          radarSeason = DEMO_SEASON;
          radarWeek = 1;
        } 

        if (!mounted) return;

        setSeason(radarSeason);
        setWeek(radarWeek);

        /* --------------------------------------------------------
           Published Radar weeks
        -------------------------------------------------------- */

        const {
          data: weekRows,
          error: weeksError,
        } = await supabase
          .from("radar_weekly_results")
          .select("week")
          .eq("season", radarSeason)
          .order("week", { ascending: true });

        if (weeksError) throw weeksError;

        if (!mounted) return;

        let radarWeeks = [
          ...new Set((weekRows || []).map((row) => row.week))
        ];

        if (DEMO_MODE && radarSeason === DEMO_SEASON) {
          radarWeeks = radarWeeks.filter(
            (availableWeek) => availableWeek <= DEMO_MAX_WEEK
          );
        }

        if (
          radarSeason === DEFAULT_SEASON &&
          !radarWeeks.includes(DEFAULT_WEEK)
        ) {
          radarWeeks = [DEFAULT_WEEK, ...radarWeeks];
        }

        setAvailableWeeks(radarWeeks);

        /* --------------------------------------------------------
           Current week's complete Radar snapshot
        -------------------------------------------------------- */

        const {
          data: currentWeekData,
          error: radarError,
        } = await supabase
          .from("radar_weekly_results")
          .select("*")
          .eq("season", radarSeason)
          .eq("week", radarWeek)
          .order("league_rank", { ascending: true });

        if (radarError) throw radarError;

        if (!mounted) return;

        setRadarData(currentWeekData || []);


        /* --------------------------------------------------------
           Complete history for current player
        -------------------------------------------------------- */

        const {
          data: historyData,
          error: historyError,
        } = await supabase
          .from("radar_weekly_results")
          .select("*")
          .eq("season", radarSeason)
          .eq("user_id", user.id)
          .order("week", { ascending: true });

        if (historyError) throw historyError;

        if (!mounted) return;

        setProfileHistory(historyData || []);
      } catch (err) {
        console.error(
          "League Radar load failed:",
          err
        );

        if (!mounted) return;

        setError(
          err?.message ||
            "Unable to load League Radar."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRadar();

    return () => {
      mounted = false;
    };
  }, []);

    const loadRadarWeek = async (targetWeek) => {
    if (!season || targetWeek === week) return;

    setLoading(true);
    setSelectedPlayer(null);

    try {
      const {
        data: currentWeekData,
        error: radarError,
      } = await supabase
        .from("radar_weekly_results")
        .select("*")
        .eq("season", season)
        .eq("week", targetWeek)
        .order("league_rank", { ascending: true });

      if (radarError) throw radarError;

      setRadarData(currentWeekData || []);
      setWeek(targetWeek);
    } catch (err) {
      console.error("League Radar week load failed:", err);
      setError(err?.message || "Unable to load League Radar week.");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     CURRENT PLAYER
  ============================================================ */

  const currentPlayer = useMemo(() => {
    return (
      radarData.find(
        (player) =>
          player.user_id === currentUserId
      ) || null
    );
  }, [radarData, currentUserId]);



  /* ============================================================
     HIGHLIGHTS
     Presentation mapping only.
  ============================================================ */

  const highlightRows = useMemo(() => {
    const rows = [];

    radarData.forEach((player) => {
      const playerHighlights =
        getHighlightItems(player);

      playerHighlights.forEach((highlight) => {
        rows.push({
          ...highlight,
          player,
        });
      });
    });

    return rows;
  }, [radarData]);


  /* ============================================================
     PROFILE
  ============================================================ */

  const profile = currentPlayer;

  /* ============================================================
     RENDER
  ============================================================ */

  
  return (
    <div className="min-h-screen bg-gray-50 px-1 pb-10 pt-5 sm:px-5 sm:pt-6">
      <div className="mx-auto w-full max-w-[1080px]">
        <PageHeader>
          League Radar
        </PageHeader>

        {!loading && !error && (
          <div className="mb-5 mt-2 flex items-center gap-1 text-sm text-gray-500">
  <div>Season {season} &nbsp;</div>

  <div className="flex items-center">
    <button
      type="button"
      aria-label="Previous week"
      disabled={availableWeeks.indexOf(week) <= 0 || loading}
      onClick={() =>
        loadRadarWeek(
          availableWeeks[availableWeeks.indexOf(week) - 1]
        )
      }
      className="flex h-8 w-8 items-center justify-center -translate-y-px text-lg font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30"
    >
      ‹
    </button>

    <span className="px-1 font-medium text-gray-600">
      Week {week}
    </span>

    <button
      type="button"
      aria-label="Next week"
      disabled={
        availableWeeks.indexOf(week) === availableWeeks.length - 1 ||
        loading
      }
      onClick={() =>
        loadRadarWeek(
          availableWeeks[availableWeeks.indexOf(week) + 1]
        )
      }
      className="flex h-8 w-8 items-center justify-center -translate-y-px text-lg font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30"
    >
      ›
    </button>
  </div>
</div>
                    )}

        {/* ERROR */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-white p-5 text-red-600 shadow-sm">
            Unable to load League Radar.
          </div>
        )}

        {/* LOADING */}
        {loading && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-400 shadow-sm">
            Loading League Radar...
          </div>
        )}

        {/* RADAR */}
        {!loading && !error && (
          <div className="flex h-auto flex-col rounded-lg border border-cyan-700 bg-[#020c12] p-3 shadow-sm sm:p-5 lg:h-[600px]">
            {/* ==================================================
                RADAR HEADER
            ================================================== */}

            <div className="flex flex-col gap-2 border-b border-[#17313d] pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm tracking-[0.22em] text-cyan-200 sm:text-base">
                IT'S HOW YOU PLAY, NOT JUST YOUR SCORE
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
  <div className="flex items-center gap-2">
    <span className="text-xs tracking-wide text-cyan-100 sm:text-sm">
      LEAGUE ARCHETYPES
    </span>

    <span className="text-[10px] text-cyan-200/70 sm:text-xs">
      click icon
    </span>
  </div>

  <div className="flex flex-wrap items-center gap-2">
    {ARCHETYPES.map((archetype) => (
      <ArchetypeIcon
        key={archetype.key}
        archetype={archetype}
        onClick={() =>
          setSelectedArchetype(archetype)
        }
      />
    ))}
  </div>
</div>
            </div>

            {/* ==================================================
                MAIN GRID
            ================================================== */}

            <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">

              {/* =================================================
                  LEFT — PROFILE
              ================================================= */}

              <section className="flex min-h-0 flex-col overflow-hidden">
                

                
                 {!profile ? (
  <div className="flex min-h-0 flex-1 flex-col">
    <div className="grid grid-cols-[56px_minmax(0,1fr)_70px] items-center gap-3 rounded-lg border border-[#164b60] bg-[#041d29] p-3 sm:grid-cols-[64px_minmax(0,1fr)_80px]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400 bg-[#087f9d] text-base font-semibold text-white sm:h-16 sm:w-16 sm:text-lg">
        {getInitials(
          currentUserId
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-white sm:text-lg">
          Radar Profile
        </div>

        <div className="mt-1 text-xs text-cyan-300 sm:text-sm">
          LEAGUE RADAR PROFILE
        </div>

        <div className="mt-1 text-[10px] text-cyan-100/60 sm:text-xs">
          Week {week}
        </div>
      </div>

      <div className="border-l border-[#31515d] pl-3 text-center">
        <div className="text-2xl font-semibold text-cyan-300 sm:text-3xl">
          —
        </div>

        <div className="text-[9px] uppercase tracking-wide text-cyan-100/60">
          RANK
        </div>

        <div className="text-[9px] text-cyan-100/60">
          Overall
        </div>
      </div>
    </div>

    <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-[#164b60] bg-[#041d29] sm:grid-cols-5">
      {[
        "WEEKLY SCORE",
        "TOTAL SCORE",
        "AVG / WEEK",
        "BEST WEEK",
        "RANK CHANGE",
      ].map((label, index) => (
        <div
          key={label}
          className={`p-1.5 text-center ${
            index < 4
              ? "border-b border-[#244b59] sm:border-b-0 sm:border-r"
              : "col-span-2 sm:col-span-1"
          }`}
        >
          <div className="text-[9px] tracking-wide text-cyan-100/60">
            {label}
          </div>

          <div className="mt-1 text-lg font-regular text-white">
            —
          </div>
        </div>
      ))}
    </div>

    {/* TOP INSIGHTS */}
<div className="mt-3 rounded-lg border border-[#164b60] bg-[#041d29] p-3">
  <div className="mb-2 text-[10px] font-semibold tracking-widest text-white">
    YOUR TOP INSIGHTS
  </div>

  <div className="text-xs text-cyan-100/60">
    Radar insights will appear here after the first weekly results are recorded.
  </div>
</div>

    {/* HISTORY */}
<div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-[#164b60] bg-[#041d29]">
  <div className="flex items-center justify-between border-b border-[#244b59] px-3 py-2">
    <div className="text-[10px] font-semibold tracking-widest text-white">
      YOUR HISTORY
    </div>

    <div className="text-[9px] text-cyan-200/60">
      0 weeks
    </div>
  </div>

  <div className="p-3 text-xs text-cyan-100/60">
    No Radar history available.
  </div>
</div>
  </div>
) : (
                    <>
                      {/* IDENTITY */}
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_70px] items-center gap-3 rounded-lg border border-[#164b60] bg-[#041d29] p-3 sm:grid-cols-[64px_minmax(0,1fr)_80px]">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400 bg-[#087f9d] text-base font-semibold text-white sm:h-16 sm:w-16 sm:text-lg">
                          {getInitials(
                            profile.username
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white sm:text-lg">
                            {profile.username}
                          </div>

                         <div className="mt-1 min-w-0 text-xs text-cyan-300 sm:text-sm">
                          <span className="truncate">
                            {profile.primary_label ||
                            "LEAGUE RADAR PROFILE"}
                          </span>
                        </div>

                        {(() => {
                          const profileDialogue = getRadarDialogue(
                            profile,
                            "profile"
                          );

                          return profileDialogue ? (
                            <div className="mt-1 text-[10px] leading-4 text-cyan-100/75 sm:text-xs">
                              {typeof profileDialogue === "object"
                                ? profileDialogue.text
                                : profileDialogue}
                            </div>
                          ) : null;
                        })()}

                        <div className="mt-1 text-[10px] text-cyan-100/60 sm:text-xs">
                          Week {profile.week}
                        </div>
                        </div>

                        <div className="border-l border-[#31515d] pl-3 text-center">
                          <div className="text-2xl font-semibold text-cyan-300 sm:text-3xl">
                            {formatRadarNumber(
                              profile.league_rank
                            )}
                          </div>

                          <div className="text-[9px] uppercase tracking-wide text-cyan-100/60">
                            RANK
                          </div>

                          <div className="text-[9px] text-cyan-100/60">
                            Overall
                          </div>
                        </div>
                      </div>

                      {/* FIVE STATS */}
                      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-[#164b60] bg-[#041d29] sm:grid-cols-5">
                        <div className="border-b border-[#244b59] p-1.5 text-center sm:border-b-0 sm:border-r">
                          <div className="text-[9px] tracking-wide text-cyan-100/60">
                            WEEKLY SCORE
                          </div>

                          <div className="mt-1 text-lg font-regular text-white">
                            {formatRadarNumber(
                              profile.weekly_score
                            )}
                          </div>
                        </div>

                        <div className="border-b border-[#244b59] p-1.5 text-center sm:border-b-0 sm:border-r">
                          <div className="text-[9px] tracking-wide text-cyan-100/60">
                            TOTAL SCORE
                          </div>

                          <div className="mt-1 text-lg font-regular text-white">
                            {formatRadarNumber(
                              profile.cumulative_score
                            )}
                          </div>
                        </div>

                        <div className="border-b border-[#244b59] p-1.5 text-center sm:border-b-0 sm:border-r">
                          <div className="text-[9px] tracking-wide text-cyan-100/60">
                            AVG / WEEK
                          </div>

                          <div className="mt-1 text-lg font-regular text-white">
                            {profile.week
                              ? (Number(profile.cumulative_score || 0) / Number(profile.week)).toFixed(2)
                              : "—"}
                          </div>
                        </div>

                        

                        <div className="border-b border-[#244b59] p-1.5 text-center sm:border-b-0 sm:border-r">
                          <div className="text-[9px] tracking-wide text-cyan-100/60">
                            BEST WEEK
                          </div>

                          <div className="mt-1 text-lg font-regular text-white">
                            {profileHistory.length > 0
                              ? (() => {
                                  const bestWeek = profileHistory.reduce(
                                    (best, current) =>
                                      Number(current.weekly_score || 0) >
                                      Number(best.weekly_score || 0)
                                        ? current
                                        : best
                                  );

                                  return `${formatRadarNumber(
                                    bestWeek.weekly_score
                                  )} (Wk ${bestWeek.week})`;
                                })()
                              : "—"}
                          </div>
                        </div>

                        <div className="col-span-2 p-1.5 text-center sm:col-span-1">
                          <div className="text-[9px] tracking-wide text-cyan-100/60">
                            RANK CHANGE
                          </div>

                          <div className="mt-1 text-lg font-regular text-white">
                            {profile.rank_change >
                            0
                              ? `+${profile.rank_change}`
                              : formatRadarNumber(
                                  profile.rank_change
                                )}
                          </div>                          
                        </div>
                      </div>

                      {/* TOP INSIGHTS */}
                      <div className="mt-3 rounded-lg border border-[#164b60] bg-[#041d29] p-3">
                        <div className="mb-2 text-[10px] font-semibold tracking-widest text-white">
                          YOUR TOP INSIGHTS
                        </div>

                        <div className="space-y-2 text-xs text-cyan-50">
                          <div className="flex items-start gap-2">
                            <span className="text-cyan-300">
                              ✥
                            </span>

                            <span>
                              Contrarian win rate:{" "}
                              {formatRadarPercent(
                                profile.contrarian_running_win_pct
                              )}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="text-cyan-300">
                              ◉
                            </span>

                            <span>
                              {profile.contrarian_picks
                                ? `${formatRadarNumber(
                                    profile.contrarian_picks
                                  )} contrarian picks this week.`
                                : "Contrarian activity is developing."}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* HISTORY */}
                      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-[#164b60] bg-[#041d29]">
                        <div className="flex items-center justify-between border-b border-[#244b59] px-3 py-2">
                          <div className="text-[10px] font-semibold tracking-widest text-white">
                            YOUR HISTORY
                          </div>

                          <div className="text-[9px] text-cyan-200/60">
                            {profileHistory.length}{" "}
                            {profileHistory.length === 1 ? "week" : "weeks"}
                          </div>
                        </div>

                        <div
                            className="
                                min-w-0
                                min-h-0
                                flex-1
                                overflow-y-auto
                                [scrollbar-width:thin]
                                [scrollbar-color:#315766_transparent]
                                [&::-webkit-scrollbar]:w-1.5
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:rounded-full
                                [&::-webkit-scrollbar-thumb]:bg-[#315766]
                                [&::-webkit-scrollbar-thumb:hover]:bg-[#477889]
                            "
                        >
                          {profileHistory.length ===
                          0 ? (
                            <div className="p-3 text-xs text-cyan-100/60">
                              No Radar history available.
                            </div>
                          ) : (
                            profileHistory.map(
                              (history) => (
                                <div
                                  key={`${history.season}-${history.week}`}
                                  className="grid grid-cols-[62px_minmax(0,1fr)_55px] items-center border-b border-[#173d4c] px-3 py-1 last:border-b-0"
                                >
                                  <div className="text-[10px] font-medium text-white">
                                    Week{" "}
                                    {history.week}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="text-[10px] text-cyan-100/80">
                                      {formatRadarNumber(
                                        history.weekly_score
                                      )}{" "}
                                      pts · Rank #
                                      {formatRadarNumber(
                                        history.league_rank
                                      )}
                                    </div>

                                    {history.primary_label && (
                                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                        {getArchetypeByLabel(history.primary_label) && (
                                        <img
                                            src={
                                            getArchetypeByLabel(
                                                history.primary_label
                                            ).image
                                            }
                                            alt=""
                                            className="h-4 w-4 shrink-0 object-contain"
                                        />
                                        )}

                                        <div className="truncate text-[9px] text-cyan-300">
                                        {history.primary_label}
                                        </div>
                                    </div>
                                    )}

                                    {(() => {
                                      const historyDialogue = getRadarDialogue(
                                        history,
                                        "history"
                                      );

                                      return historyDialogue ? (
                                        <div className="mt-0.5 text-[9px] leading-tight text-cyan-100/70">
                                          {typeof historyDialogue === "object"
                                            ? historyDialogue.text
                                            : historyDialogue}
                                        </div>
                                      ) : null;
                                    })()}

                                  </div>

                                  <div className="text-right text-[10px] text-cyan-100/70">
                                    {formatRadarNumber(
                                      history.cumulative_score
                                    )}{" "}
                                    total
                                  </div>
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
                
              </section>

              {/* =================================================
                  RIGHT COLUMN
              ================================================= */}

              <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">

                {/* =================================================
                    HIGHLIGHTS
                ================================================= */}

                <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a5368] bg-[#031923]">
                  <div className="flex items-start justify-between border-b border-[#173d4c] px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold text-white sm:text-sm">
                        THIS WEEK'S HIGHLIGHTS
                      </div>

                      <div className="mt-1 text-[9px] text-cyan-200/60 sm:text-[10px]">
                        League Radar · Week {week}
                      </div>
                    </div>

                    <div className="text-[9px] text-cyan-300 sm:text-[10px]">
                      {highlightRows.length}{" "}
                      {highlightRows.length === 1
                        ? "highlight"
                        : "highlights"}
                    </div>
                  </div>

                  <div
                    className="
                        min-h-0
                        flex-1
                        overflow-y-auto
                        p-2
                        [scrollbar-width:thin]
                        [scrollbar-color:#315766_transparent]
                        [&::-webkit-scrollbar]:w-1.5
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-[#315766]
                        [&::-webkit-scrollbar-thumb:hover]:bg-[#477889]
                    "
                    >
                    {highlightRows.length ===
                    0 ? (
                      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-cyan-100/60">
                        No highlights were recorded
                        for this week.
                      </div>
                    ) : (
                      highlightRows.map(
                        (highlight, index) => (
                          <div
                            key={`${highlight.player.user_id}-${highlight.type}-${index}`}
                            className="grid grid-cols-[28px_minmax(0,1fr)_45px] gap-4 border-b border-[#173d4c] px-2 py-2.5 last:border-b-0"
                          >
                            <div className="flex h-8 w-8 items-center justify-center">
                            {highlight.archetype ? (
                                <ArchetypeIcon
                                    archetype={highlight.archetype}
                                    onClick={() => setSelectedArchetype(highlight.archetype)}
                                    size="small"
                                />
                            ) : (
                                <AchievementIcon
                                    type={highlight.type}
                                    size="small"
                                />
                            )}
                            </div>
        
                            <div className="min-w-0">
                                
                              {highlight.archetype ? (
                                    <div
    className="mt-2 text-[12px] font-semibold"
    style={{ color: highlight.archetype.color }}
>
                                        {highlight.type}
                                    </div>
                                ) : (
                                    
                                    <div
  className={`mb-1 inline-flex rounded-sm border px-3 py-0.5 ${
    ACHIEVEMENT_LABEL_COLORS[highlight.type] ||
    "border-white/10 bg-white/10 text-white"
  }`}
>
  <span className="text-[9px] font-bold tracking-wide">
    {highlight.type}
  </span>
</div>
                                )}

                              <div className="truncate text-[11px] font-medium text-white">
                                {
                                  highlight
                                    .player
                                    .username
                                }
                              </div>

                              <div className="mt-0.5 text-[9px] leading-4 text-cyan-100/70">
                              {(() => {
                                const highlightSituation =
                                  highlight.type === "HOT WEEK"
                                    ? "HOT HAND"
                                    : highlight.type;

                                const highlightDialogue = getRadarDialogue(
                                  highlight.player,
                                  "highlight",
                                  highlightSituation
                                );

                                return highlightDialogue
                                  ? typeof highlightDialogue === "object"
                                    ? highlightDialogue.text
                                    : highlightDialogue
                                  : highlight.description;
                              })()}
                            </div>
                            </div>

                            <div className="text-right text-[9px] text-cyan-100/70">
                              {
                                highlight.value
                              }
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </section>

                {/* =================================================
                    EVERY PLAYER'S INSIGHT
                ================================================= */}

                <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a5368] bg-[#031923]">
                  <div className="flex items-start justify-between border-b border-[#173d4c] px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold text-white sm:text-sm">
                        EVERY PLAYER'S INSIGHT
                      </div>

                      <div className="mt-1 text-[9px] text-cyan-200/60 sm:text-[10px]">
                        Click a player to view their Radar details.
                      </div>
                    </div>

                    <div className="text-[9px] text-cyan-300 sm:text-[10px]">
                      {radarData.length} players
                    </div>
                  </div>

                  <div
                    className="
                        min-h-0
                        flex-1
                        overflow-y-auto
                        [scrollbar-width:thin]
                        [scrollbar-color:#315766_transparent]
                        [&::-webkit-scrollbar]:w-1.5
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-[#315766]
                        [&::-webkit-scrollbar-thumb:hover]:bg-[#477889]
                    "
                    >
                    {radarData.map((player) => (
                      <button
                        key={player.user_id}
                        type="button"
                        onClick={() =>
                          setSelectedPlayer(
                            player
                          )
                        }
                        className="grid w-full grid-cols-[28px_minmax(0,1fr)_65px] items-center gap-2 border-b border-[#173d4c] px-3 py-2 text-left transition hover:bg-[#062435] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-400"
                      >
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-white/40 text-[8px] font-semibold text-white"
                          style={{ backgroundColor: getProfileColor(player.user_id) }}
                        >
                          {getInitials(
                            player.username
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-medium text-white">
                            {player.username}
                          </div>

                          <div className="mt-0.5 text-[9px] text-cyan-100/60">
                            Rank{" "}
                            {formatRadarNumber(
                              player.league_rank
                            )}{" "}
                            ·{" "}
                            {formatRadarNumber(
                              player.weekly_score
                            )}{" "}
                            points
                          </div>

                          {(() => {
                            const insightDialogue = getRadarDialogue(
                              player,
                              "insight"
                            );

                            return insightDialogue ? (
                              <div className="mt-1 text-[9px] leading-tight text-cyan-200/80">
                                {typeof insightDialogue === "object"
                                  ? insightDialogue.text
                                  : insightDialogue}
                              </div>
                            ) : null;
                          })()}
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] text-cyan-100/70">
                            {formatRadarNumber(
                              player.cumulative_score
                            )}{" "}
                            total
                          </div>

                          {player.rank_change >
                            0 && (
                            <div className="mt-0.5 text-[9px] text-[#69d28a]">
                              ▲{" "}
                              {
                                player.rank_change
                              }
                            </div>
                          )}

                          {player.rank_change <
                            0 && (
                            <div className="mt-0.5 text-[9px] text-[#ff6969]">
                              ▼{" "}
                              {Math.abs(
                                player.rank_change
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PLAYER MODAL
        ======================================================== */}

        <PlayerModal
  player={selectedPlayer}
  onClose={() => setSelectedPlayer(null)}
/>

        {/* ========================================================
            ARCHETYPE EDUCATION MODAL
        ======================================================== */}

        <ArchetypeModal
  archetype={selectedArchetype}
  onClose={() => setSelectedArchetype(null)}
/>
      </div>
    </div>
  );
}