import { useEffect, useState, useRef } from "react";

export default function Scoreboard({ collapsed }) {
  const [scores, setScores] = useState([]);
  const [error, setError] = useState(null);
  const [week, setWeek] = useState("current");
  const [currentWeek, setCurrentWeek] = useState(null);
  const scrollRef = useRef(null);

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

  // --- Fetch scores for selected week ---
  useEffect(() => {
    const fetchScores = async () => {
      try {
        let baseUrl =
          "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
        let url = baseUrl;

        if (week !== "current") {
          const { seasontype, week: wk } = weekMap[week];
          url = `${baseUrl}?seasontype=${seasontype}&week=${wk}`;
        }

        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Score API error");
        const json = await resp.json();

        if (!currentWeek && json.week?.number) setCurrentWeek(json.week.number);
        setScores(json.events || []);
      } catch {
        setError("Unable to load scores. Try again later.");
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 60000);
    return () => clearInterval(interval);
  }, [week, currentWeek]);

  if (error) return null;

  // --- Scrolling helpers ---
  const getVisibleCards = () => {
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

  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${
        collapsed ? "h-0" : "h-auto"
      }`}
      style={{ backgroundColor: "#f1f2f3" }}
    >
      <div
        className="w-full md:max-w-[70%] mx-auto px-2 md:px-4 flex items-stretch relative"
        style={{ height: "80px" }}
      >
        {/* Left controls: Week dropdown + Left arrow */}
        <div className="flex items-center space-x-2 z-10 relative">
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="bg-white text-black rounded border border-gray-300 text-xs px-2 py-1"
            aria-label="Select week"
            style={{width: "96px"}}
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
          {scores.map((game, idx) => {
            const comp = game.competitions?.[0]?.competitors;
            if (!comp) return null;
            const home = comp.find((t) => t.homeAway === "home");
            const away = comp.find((t) => t.homeAway === "away");

            return (
              <div
                key={game.id}
                className={`score-card snap-start h-full flex flex-col items-center justify-center px-3 py-1 bg-white w-[120px] flex-shrink-0 leading-tight ${
                  idx !== scores.length - 1 ? "border-r border-gray-300" : ""
                }`}
              >
                <span className="text-[11px] text-gray-500 mb-1 truncate">
                  {game.status?.type?.shortDetail}
                </span>
                <div className="flex flex-col text-xs w-full">
                  <div className="flex justify-between pb-0.5">
                    <span className="font-bold">
                      {away?.team?.abbreviation}
                    </span>
                    {away?.score && <span>{away.score}</span>}
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="font-bold">
                      {home?.team?.abbreviation}
                    </span>
                    {home?.score && <span>{home.score}</span>}
                  </div>
                </div>
              </div>
            );
          })}
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
