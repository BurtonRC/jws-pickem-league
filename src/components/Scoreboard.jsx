import { useEffect, useState, useRef } from "react";
import { createClient } from '@supabase/supabase-js';

// --- Initialize Supabase client (outside the component so it isn't recreated) ---
// Make sure your .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Scoreboard({ collapsed }) {
  const [scores, setScores] = useState([]);
  const [error, setError] = useState(null);
  const [week, setWeek] = useState("current");
  const [currentWeek, setCurrentWeek] = useState(null);
  const scrollRef = useRef(null);

  // --- Fallback logo ---
  const FALLBACK_LOGO = "/logos/fallback.png";

  // --- Mapping from team abbreviation to your local logo file name ---
  const teamLogoMap = {
    ari: "cardinals",
    atl: "falcons",
    bal: "ravens",
    buf: "bills",
    car: "panthers",
    chi: "bears",
    cin: "bengals",
    cle: "browns",
    dal: "cowboys",
    den: "broncos",
    det: "lions",
    gb: "packers",
    hou: "texans",
    ind: "colts",
    jax: "jaguars",
    kc: "chiefs",
    lar: "rams",
    lac: "chargers",
    lv: "raiders",
    mia: "dolphins",
    min: "vikings",
    ne: "patriots",
    no: "saints",
    nyg: "giants",
    nyj: "jets",
    phi: "eagles",
    pit: "steelers",
    sf: "49ers",
    sea: "seahawks",
    tb: "buccaneers",
    ten: "titans",
    wsh: "commanders",
  };

  // --- Helper to get local logo ---
  const getTeamLogo = (abbreviation) => {
    if (!abbreviation) return FALLBACK_LOGO;
    const fileName = teamLogoMap[abbreviation.toLowerCase()];
    if (!fileName) return FALLBACK_LOGO;
    return `/logos/${fileName}.png`;
  };

  // --- Team Records State ---
  const [teamRecords, setTeamRecords] = useState({});

  // --- Week mapping ---
  const weekMap = {
    pre1: { seasontype: 1, week: 1, label: "Pre Week 1" },
    pre2: { seasontype: 1, week: 2, label: "Pre Week 2" },
    pre3: { seasontype: 1, week: 3, label: "Pre Week 3" },
    pre4: { seasontype: 1, week: 4, label: "Pre Week 4" },
    // Regular season weeks 1–18
    ...Array.from({ length: 18 }, (_, i) => i + 1).reduce((acc, w) => {
      acc[`reg${w}`] = { seasontype: 2, week: w, label: `Week ${w}` };
      return acc;
    }, {}),
    // Postseason
    post1: { seasontype: 3, week: 1, label: "Wildcard" },
    post2: { seasontype: 3, week: 2, label: "Divisional" },
    post3: { seasontype: 3, week: 3, label: "Conference Championships" },
    post4: { seasontype: 3, week: 4, label: "Super Bowl" },
  };

  useEffect(() => {
  const fetchScoresAndRecords = async () => {
    try {
      // --- Fetch scores from ESPN ---
      let baseUrl =
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
      let url =
        week !== "current"
          ? `${baseUrl}?seasontype=${weekMap[week].seasontype}&week=${weekMap[week].week}`
          : baseUrl;

      let json = null;
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          json = await resp.json();
          setScores(json.events || []);
          const espnCurrentWeek = json.season?.week || 1;
          setCurrentWeek(espnCurrentWeek);

          // Auto-advance week if current and all games finished
          if (week === "current") {
            const allGamesFinished = (json.events || []).every(
              (g) => g.status?.type?.completed === true
            );
            if (allGamesFinished && espnCurrentWeek < 18) {
              setWeek(`reg${espnCurrentWeek + 1}`);
            }
          }
        } else {
          console.warn("Score API returned non-OK:", resp.status);
          setScores([]);
        }
      } catch (err) {
        console.warn("Scores fetch failed:", err);
        setScores([]);
      }

// --- Fetch team records from Supabase ---
try {
  const { data, error: sbError } = await supabase
    .from("game_results")
    .select("home_team, away_team, winner");

  if (sbError) {
    console.warn("Supabase query error:", sbError);
    setTeamRecords({});
  } else if (!data) {
    setTeamRecords({});
  } else {
    // --- Map database team names to abbreviations ---
    const abbrMap = {
      "Arizona Cardinals": "ari",
      "Atlanta Falcons": "atl",
      "Baltimore Ravens": "bal",
      "Buffalo Bills": "buf",
      "Carolina Panthers": "car",
      "Chicago Bears": "chi",
      "Cincinnati Bengals": "cin",
      "Cleveland Browns": "cle",
      "Dallas Cowboys": "dal",
      "Denver Broncos": "den",
      "Detroit Lions": "det",
      "Green Bay Packers": "gb",
      "Houston Texans": "hou",
      "Indianapolis Colts": "ind",
      "Jacksonville Jaguars": "jax",
      "Kansas City Chiefs": "kc",
      "Las Vegas Raiders": "lv",
      "Los Angeles Chargers": "lac",
      "Los Angeles Rams": "lar",
      "Miami Dolphins": "mia",
      "Minnesota Vikings": "min",
      "New England Patriots": "ne",
      "New Orleans Saints": "no",
      "New York Giants": "nyg",
      "New York Jets": "nyj",
      "Philadelphia Eagles": "phi",
      "Pittsburgh Steelers": "pit",
      "San Francisco 49ers": "sf",
      "Seattle Seahawks": "sea",
      "Tampa Bay Buccaneers": "tb",
      "Tennessee Titans": "ten",
      "Washington Commanders": "wsh",
    };

    // Initialize records with W-L-T
    const recs = {};
    Object.keys(teamLogoMap).forEach((k) => {
      recs[k] = { wins: 0, losses: 0, ties: 0 };
    });

    data.forEach((row) => {
      const home = abbrMap[row.home_team] || row.home_team?.toLowerCase();
      const away = abbrMap[row.away_team] || row.away_team?.toLowerCase();
      const winner = abbrMap[row.winner] || row.winner?.toLowerCase();

      // Defensive: skip unknown teams
      if (!home || !away) return;

      if (winner) {
        recs[winner].wins += 1;
        const loser = winner === home ? away : home;
        recs[loser].losses += 1;
      } else {
        // Tie: increment ties for both teams
        recs[home].ties += 1;
        recs[away].ties += 1;
      }
    });

    // Convert to "W-L-T" strings
    const formatted = {};
    Object.entries(recs).forEach(([team, r]) => {
      formatted[team] = `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`;
    });

    setTeamRecords(formatted);
  }
} catch (err) {
  console.warn("Team records fetch error:", err);
  setTeamRecords({});
}

    } catch (err) {
      console.error("Error fetching scores or records:", err);
      setError("Unable to load scores or records. Try again later.");
      setTeamRecords({});
      setScores([]);
    }
  };

  fetchScoresAndRecords();
  const interval = setInterval(fetchScoresAndRecords, 60000); // refresh every minute
  return () => clearInterval(interval);
}, [week]);


  // --- Scrolling helpers ---
  const getVisibleCards = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 640) return 2; // mobile
    if (window.innerWidth < 1024) return 3; // tablet
    return 7; // desktop
  };

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector(".score-card");
    const cardWidth = card?.offsetWidth || 120;
    const gap = 4;
    const step = getVisibleCards();
    scrollRef.current.scrollBy({
      left:
        dir === "left"
          ? -(cardWidth + gap) * step
          : (cardWidth + gap) * step,
      behavior: "smooth",
    });
  };

  // don't return null on error — render fallback UI instead
  // if you want to short-circuit the whole scoreboard: you can uncomment the next line
  // if (error) return <div className="p-2 text-sm text-red-600">{error}</div>;

  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${collapsed ? "h-0" : "h-auto"}`}
      style={{ backgroundColor: "#f1f2f3" }}
    >
      <div
        className="w-full md:max-w-[1230px] mx-auto px-2 md:px-4 flex items-stretch relative"
        style={{ height: "80px" }}
      >
        {/* Left controls: Week dropdown + Left arrow */}
        <div className="flex items-center space-x-2 z-10 relative">
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="bg-white text-black rounded border border-gray-300 text-xs px-2 py-1"
            aria-label="Select week"
            style={{ width: "96px" }}
          >
            <option value="current">Current</option>

            <optgroup label="Preseason">
              <option value="pre1">Pre Week 1</option>
              <option value="pre2">Pre Week 2</option>
              <option value="pre3">Pre Week 3</option>
              <option value="pre4">Pre Week 4</option>
            </optgroup>

            <optgroup label="Regular Season">
              {Array.from({ length: 18 }, (_, i) => (
                <option key={`reg${i + 1}`} value={`reg${i + 1}`}>
                  Week {i + 1}
                </option>
              ))}
            </optgroup>

            <optgroup label="Postseason">
              <option value="post1">Wildcard</option>
              <option value="post2">Divisional</option>
              <option value="post3">Conference Championships</option>
              <option value="post4">Super Bowl</option>
            </optgroup>
          </select>

          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex bg-white shadow items-center justify-center ml-2"
            style={{ width: "28px", height: "100%" }}
            aria-label="Scroll left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Scroll track */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide flex-1 p-2 rounded snap-x snap-mandatory"
          style={{ backgroundColor: "#fff", gap: "4px" }}
        >
          {scores?.length ? (
            scores.map((game, idx) => {
              const comp = game.competitions?.[0]?.competitors;
              if (!comp) return null;
              const home = comp.find((t) => t.homeAway === "home");
              const away = comp.find((t) => t.homeAway === "away");

              // Determine if we should show score or pre-game record
              const showScore =
                game.status?.type?.completed || game.status?.type?.state === "in";

              return (
                <div
                  key={game.id}
                  className={`score-card snap-start h-full flex flex-col items-center justify-center px-3 py-1 bg-white w-[120px] flex-shrink-0 leading-tight ${
                    idx !== scores.length - 1 ? "border-r border-gray-300" : ""
                  }`}
                >
                  {/* Game status (time, final, etc.) */}
                  <span className="text-[11px] text-gray-500 mb-1 truncate">
                    {game.status?.type?.shortDetail || "Pre-game"}
                  </span>
{/* Teams and scores/records */}
<div className="flex flex-col text-xs w-full">
  {/* Away Team */}
  <div className="flex justify-between items-center pb-0.5">
    <div className="flex items-center space-x-1">
      <img
        src={getTeamLogo(away?.team?.abbreviation)}
        alt={away?.team?.abbreviation}
        className="w-4 h-4 object-contain"
        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
      />
      <span className="font-bold">{away?.team?.abbreviation}</span>
    </div>

    <div className="flex items-center space-x-1">
      {/* Pre-game record */}
      {teamRecords[away?.team?.abbreviation.toLowerCase()] && (
        <span
          className={`text-gray-400 text-xs transition-all duration-300 ${
            showScore ? "mr-1" : ""
          }`}
        >
          {teamRecords[away?.team?.abbreviation.toLowerCase()]}
        </span>
      )}

      {/* Score */}
      {showScore && (
        <span className="font-bold">{away?.score ?? "-"}</span>
      )}
    </div>
  </div>

  {/* Home Team */}
  <div className="flex justify-between items-center pt-0.5">
    <div className="flex items-center space-x-1">
      <img
        src={getTeamLogo(home?.team?.abbreviation)}
        alt={home?.team?.abbreviation}
        className="w-4 h-4 object-contain"
        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
      />
      <span className="font-bold">{home?.team?.abbreviation}</span>
    </div>

    <div className="flex items-center space-x-1">
      {/* Pre-game record */}
      {teamRecords[home?.team?.abbreviation.toLowerCase()] && (
        <span
          className={`text-gray-400 text-xs transition-all duration-300 ${
            showScore ? "mr-1" : ""
          }`}
        >
          {teamRecords[home?.team?.abbreviation.toLowerCase()]}
        </span>
      )}

      {/* Score */}
      {showScore && (
        <span className="font-bold">{home?.score ?? "-"}</span>
      )}
    </div>
  </div>
</div>

                </div>
              );
            })
          ) : (
            <div className="w-full text-center py-4 text-sm text-gray-500">
              {error ? "Error loading scores." : "Loading scores..."}
            </div>
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="hidden sm:flex bg-white shadow items-center justify-center z-10"
          style={{ width: "28px", height: "100%" }}
          aria-label="Scroll right"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
