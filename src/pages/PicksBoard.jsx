import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

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

export default function PicksBoard({ weekNumber }) {
  const [picks, setPicks] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);
  const [allOpen, setAllOpen] = useState(false); // track expand/collapse state
  const cardRefs = useRef({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: picksData, error } = await supabase
        .from("weekly_picks")
        .select("id, username, picks, survivor_pick, week")
        .eq("week", weekNumber);

      if (error) {
        console.error("Error fetching picks:", error);
        setLoading(false);
        return;
      }

      const gamesData = await fetchGamesForWeek(weekNumber);

      setPicks(picksData || []);
      setGames(gamesData);
      setLoading(false);
    };

    load();
  }, [weekNumber]);

  if (loading) {
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

  const toggleCard = (id) => {
    const newOpen = openCard === id ? null : id;
    setOpenCard(newOpen);

    // Smooth scroll into view if opening
    if (newOpen && cardRefs.current[id]) {
      setTimeout(() => {
        cardRefs.current[id].scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); // delay to allow maxHeight animation
    }
  };

  const toggleAllCards = () => {
    const newAllOpen = !allOpen;
    setAllOpen(newAllOpen);
    setOpenCard(newAllOpen ? "all" : null);

    if (newAllOpen) {
      // Scroll to top container when expanding all
      document.getElementById("picksboard-header")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-4">
        {/* Header + Expand/Collapse Button */}
        <div
          id="picksboard-header"
          className="w-full p-2 md:w-[90%] md:p-6 max-w-5xl mx-auto"
        >
          <h1 className="text-2xl font-bold mb-2 md:mb-4 text-center md:text-left">
            Wk {weekNumber} User's Picks
          </h1>

          {/* button stacks under the header; left on mobile, centered on tablet+ */}
          <div className="flex justify-center md:justify-center">
            <button
              onClick={toggleAllCards}
              className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            >
              {allOpen ? "Collapse All" : "Expand All"}
            </button>
          </div>
        </div>

        {visiblePicks
          .sort((a, b) => a.username.localeCompare(b.username))
          .map((pick) => {
          const isOpen = allOpen || openCard === pick.id;
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
