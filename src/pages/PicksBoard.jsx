import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "@/components/PageHeader";

/**
 * Fetch games from ESPN for a given week and map to simple matchup objects.
 */
async function fetchGamesForWeek(weekNumber) {
  const year = new Date().getFullYear();
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?year=${year}&seasontype=2&week=${weekNumber}`
  );
  const data = await res.json();

  if (!data.events || data.events.length === 0) return [];

  return data.events.map((game) => {
    const comp = game.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");

    return {
      id: game.id,
      kickoff: new Date(game.date),
      matchup: `${away.team.abbreviation} @ ${home.team.abbreviation}`,
    };
  });
}

/**
 * Fetch the *current* NFL week directly from ESPN API.
 */
async function fetchCurrentWeek() {
  const year = new Date().getFullYear();
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?year=${year}&seasontype=2`
  );
  const data = await res.json();
  return data.week?.number ?? 1; // fallback to 1 if missing
}

export default function PicksBoard() {
  const [picks, setPicks] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState({}); // track open state for each card individually
  const [allOpen, setAllOpen] = useState(false); // track expand/collapse state
  const [currentWeek, setCurrentWeek] = useState(null); // track the actual current week
  const [selectedWeek, setSelectedWeek] = useState(null); // track user’s dropdown selection
  const cardRefs = useRef({});

  // fetch the true current week
  useEffect(() => {
    const init = async () => {
      const week = await fetchCurrentWeek();
      setCurrentWeek(week);
      setSelectedWeek(week); // default to current week on load
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return; // wait until week known
    const load = async () => {
      setLoading(true);

      const { data: picksData, error } = await supabase
        .from("weekly_picks")
        .select("id, username, picks, survivor_pick, week")
        .eq("week", selectedWeek);

      if (error) {
        console.error("Error fetching picks:", error);
        setLoading(false);
        return;
      }

      const gamesData = await fetchGamesForWeek(selectedWeek);

      setPicks(picksData || []);
      setGames(gamesData);
      setLoading(false);
    };

    load();
  }, [selectedWeek]);

  if (loading || !currentWeek || !selectedWeek) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-medium text-gray-700">Loading user's picks...</p>
      </div>
    );
  }

  const now = new Date();

  const firstKickoff = games
    .filter((g) =>
      ["Thu", "Fri", "Sat"].includes(
        new Date(g.kickoff).toLocaleString("en-US", { weekday: "short" })
      )
    )
    .map((g) => g.kickoff)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  const secondKickoff = games
    .filter((g) =>
      !["Thu", "Fri", "Sat"].includes(
        new Date(g.kickoff).toLocaleString("en-US", { weekday: "short" })
      )
    )
    .map((g) => g.kickoff)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  const visiblePicks = picks.map((pick) => {
    const filtered = {};
    for (const [gameId, team] of Object.entries(pick.picks || {})) {
      const game = games.find((g) => g.id === gameId);
      if (!game) continue;

      const day = new Date(game.kickoff).toLocaleString("en-US", { weekday: "short" });

      if (["Thu", "Fri", "Sat"].includes(day) && now >= new Date(firstKickoff)) {
        filtered[gameId] = team;
      } else if (!["Thu", "Fri", "Sat"].includes(day) && now >= new Date(secondKickoff)) {
        filtered[gameId] = team;
      }
    }

    const survivorVisible = now >= new Date(secondKickoff);
    return {
      ...pick,
      picks: filtered,
      survivor_pick: survivorVisible ? pick.survivor_pick : null,
    };
  });

   // Toggle a single card open/closed
  const toggleCard = (id) => {
    setOpenCards((prev) => ({
      ...prev,
      [id]: !prev[id], // toggle this card
    }));
  };

  // Toggle all cards open/closed
  const toggleAllCards = () => {
    const newAllOpen = !allOpen;
    setAllOpen(newAllOpen);

    setAllOpen(newAllOpen);

    if (newAllOpen) {
      // Open all cards individually
      const allOpenState = {};
      picks.forEach((pick) => {
        allOpenState[pick.id] = true;
      });
      setOpenCards(allOpenState);
    } else {
      // Close all cards
      setOpenCards({});
    }

    // No scroll needed when expanding/collapsing all
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 pt-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto space-y-4">
        {/* Header + Expand/Collapse Button + Week Dropdown */}
        <div id="picksboard-header">
          <PageHeader>
            User's Picks
          </PageHeader>

          {/* dropdown + button container (side by side even on mobile) */}
          <div className="flex flex-row items-center justify-center md:justify-center gap-4">
            {/* Week selector dropdown */}
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="border px-3 py-2 rounded"
            >
              {Array.from({ length: currentWeek }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>

            {/* Expand/Collapse button with fixed width wrapper */}
<div className="inline-block" style={{ width: "9rem" }}> 
  {/* 9rem chosen to fit "Collapse All" comfortably; adjust if needed */}
  <button
    onClick={toggleAllCards}
    className="bg-blue-500 text-white px-4 py-2 rounded w-full text-center"
  >
    {allOpen ? "Collapse All" : "Expand All"}
  </button>
</div>

          </div>
        </div>

        {/* Picks mapping */}
        {visiblePicks
          .sort((a, b) => a.username.localeCompare(b.username))
          .map((pick) => {
            const isOpen = !!openCards[pick.id]; // per-card open state
            return (
              <div
                key={pick.id}
                className="bg-white shadow-md rounded-2xl overflow-hidden mx-auto w-full max-w-md"
              >
                {/* Accordion header */}
                <button
                  className="w-full px-4 py-3 text-left font-bold bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
                  onClick={() => toggleCard(pick.id)}
                >
                  {pick.username}
                  <svg
                    className={`w-5 h-5 ml-2 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Accordion content */}
                <div
                  ref={(el) => (cardRefs.current[pick.id] = el)}
                  className="transition-all duration-300 overflow-hidden"
                  style={{
                    maxHeight: isOpen
                      ? `${cardRefs.current[pick.id]?.scrollHeight}px`
                      : "0px",
                  }}
                >
                  <div className="p-4 divide-y">
                    {games.map((game) => (
                      <div key={game.id} className="flex justify-between items-center py-2">
                        <span className="text-sm">{game.matchup}</span>
                        <span className="font-semibold">{pick.picks[game.id] ?? "-"}</span>
                      </div>
                    ))}

                    {/* Survivor pick */}
                    <div className="flex justify-between items-center py-2 font-medium">
                      <span className="italic">Survivor</span>
                      <span>{pick.survivor_pick || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>

  );
}
