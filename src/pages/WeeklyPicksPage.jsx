// WeeklyPicksPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import WarningModal from "../components/WarningModal";
import * as leagueConfig from "../data/leagueConfig";


/** Local confirmation modal (keeps your WarningModal for warnings only) */
function ConfirmationModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-green-600">Picks Submitted</h2>
        <p className="text-gray-700">{message}</p>
        <button
          className="mt-2 w-full bg-green-500 text-white font-semibold py-2 rounded-xl hover:bg-green-600 active:bg-green-700 transition"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function WeeklyPicksPage() {
  // Upload New Week from ESPN
  const manualWeekNumber = 2; // <-- manually set the week you want

  // Core selection state (unchanged)
  const [selectedTeams, setSelectedTeams] = useState({});
  const [sliderOn, setSliderOn] = useState({});
  const [pointSpreadSelection, setPointSpreadSelection] = useState({});

  // Two-phase submission locks
  const [submittedFirst, setSubmittedFirst] = useState(false);
  const [submittedSecond, setSubmittedSecond] = useState(false);

  // Two countdown strings, shown inline with their submit areas
  const [timeFirst, setTimeFirst] = useState(null);
  const [timeSecond, setTimeSecond] = useState(null);

  // Survivor
  const [survivorPick, setSurvivorPick] = useState("");
  const [survivorLost, setSurvivorLost] = useState(false);
  const [pickedTeams, setPickedTeams] = useState([]);

  // Modals
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnMessages, setWarnMessages] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  // Weeks & games
  const [currentWeek, setCurrentWeek] = useState(null);
  const [games, setGames] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  // Track Drive-By (DB) picks separately
  const [DBs, setDBs] = useState({});

  // Helper: determine if a game is in the first submit group (Thu-Fri-Sat)
  const isFirstSubmitGame = (game) => ["Thu", "Fri", "Sat"].includes(game.day);


  // TEMP: Log game IDs for leagueConfig
  useEffect(() => {
  const fetchAndLogGameIDs = async () => {
    try {
      // Use the manualWeekNumber you already set
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${manualWeekNumber}`
      );
      const data = await res.json();

      if (!data.events || data.events.length === 0) {
        console.log("No events found for this week.");
        return;
      }

      console.log("=== Game IDs for driveByGames ===");
      data.events.forEach((game) => {
  console.log(`${game.id}: ${game.name}`);
});
      console.log("=== End of Game IDs ===");
    } catch (err) {
      console.error("Error fetching ESPN games:", err);
    }
  };

  fetchAndLogGameIDs();
}, []);





useEffect(() => {
  const fetchWeekGames = async () => {
    console.log("Fetching schedule for manual week:", manualWeekNumber);

    try {
      // ---- Fetch live ESPN scoreboard for the manual week ----
      const year = new Date().getFullYear();
      const resWeek = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?year=${year}&seasontype=2&week=${manualWeekNumber}`
      );
      const weekData = await resWeek.json();


      console.log("ESPN raw events:", weekData.events, "Manual week:", manualWeekNumber);

      // Map ESPN games into your expected structure
      const weekGames = (weekData.events || []).map((game) => {
        const matchup = game.name.split(" at ");
        const kickoffUTC = new Date(game.date);

        const day = kickoffUTC.toLocaleString("en-US", { weekday: "short" });

        return {
          id: game.id,
          teams: matchup,
          dbTeam: "",       
          dbLabel: "",      
          pointSpread: [],  
          day,              
          kickoffUTC: kickoffUTC.toISOString(), 
        };
      });

      // Overlay DB teams and point spreads as before
      const mappedGames = weekGames.map((game) => {
        const gameIdStr = String(game.id);
        const dbTeam = leagueConfig.driveByGames[gameIdStr] || "";
        const dbLabel = dbTeam ? "DB" : "";
        const ps = leagueConfig.pointSpreads[gameIdStr] || [];

        return {
          ...game,
          dbTeam,
          dbLabel,
          pointSpread: ps,
        };
      });

      // Sort games Thu-Fri-Sat first
      const sortedGames = [
        ...mappedGames
          .filter(g => ["Thu", "Fri", "Sat"].includes(g.day))
          .sort((a, b) => new Date(a.kickoffUTC) - new Date(b.kickoffUTC)),
        ...mappedGames
          .filter(g => !["Thu", "Fri", "Sat"].includes(g.day))
          .sort((a, b) => new Date(a.kickoffUTC) - new Date(b.kickoffUTC))
      ];

      setCurrentWeek({ weekNumber: manualWeekNumber });
      setGames(sortedGames);
      setAllTeams(
        Array.from(new Set(sortedGames.flatMap((game) => game.teams)))
      );

    } catch (err) {
      console.error("Failed to fetch/load NFL schedule:", err);
    }
  };

  fetchWeekGames();
}, []);





useEffect(() => {
  // Initialize sliderOn based on selectedTeams
  const initialSliders = {};
  games.forEach((g) => {
    if (selectedTeams[g.id] === g.dbTeam) {
      initialSliders[g.id] = true;
    }
  });
  setSliderOn(initialSliders);
}, [games, selectedTeams]);



// ------------------------------
// Kickoff helpers
// ------------------------------

// Compute earliest kickoff for first submit group (Thu-Fri-Sat)
const firstKickoff = useMemo(() => {
  const firstGames = games.filter(g => ["Thu", "Fri", "Sat"].includes(g.day));
  if (firstGames.length === 0) return null;
  return new Date(Math.min(...firstGames.map(g => new Date(g.kickoffUTC).getTime())));
}, [games]);

// Compute earliest kickoff for second submit group (the rest)
const secondKickoff = useMemo(() => {
  const secondGames = games.filter(g => !["Thu", "Fri", "Sat"].includes(g.day));
  if (secondGames.length === 0) return null;
  return new Date(Math.min(...secondGames.map(g => new Date(g.kickoffUTC).getTime())));
}, [games]);

// ------------------------------
// Countdown effect (timers for first & second submit groups)
// ------------------------------
useEffect(() => {
  // Helper to setup a countdown for a given kickoff
  const setupCountdown = (kickoff, setStr) => {
    if (!kickoff) {
      setStr("Kickoff time TBD");
      return () => {};
    }

    const update = () => {
      const diff = kickoff - new Date();
      if (diff <= 0) {
        setStr("Kickoff reached!");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setStr(`Time until kickoff: ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    // Initial update immediately
    update();

    // Update every second
    const timerId = setInterval(update, 1000);

    // Cleanup interval on unmount or dependency change
    return () => clearInterval(timerId);
  };

  // Setup countdown timers for first and second submit groups
  const cleanupFirst = setupCountdown(firstKickoff, setTimeFirst);
  const cleanupSecond = setupCountdown(secondKickoff, setTimeSecond);

  // Cleanup intervals on unmount
  return () => {
    cleanupFirst();
    cleanupSecond();
  };
}, [firstKickoff, secondKickoff]);

// ------------------------------
// Disable logic per section
// ------------------------------
// Only lock when the countdown has reached "Kickoff reached!" or the user has submitted
const firstLocked = submittedFirst; // || timeFirst === "Kickoff reached!";
const secondLocked = submittedSecond || timeSecond === "Kickoff reached!";



// Optional debug
console.log("First group kickoff:", firstKickoff);
console.log("Second group kickoff:", secondKickoff);
console.log("First locked?", firstLocked);
console.log("Second locked?", secondLocked);



  // Handlers
  const toggleSlider = (id, checked, dbTeam) => {
  // Update slider toggle UI
  setSliderOn((prev) => ({ ...prev, [id]: checked }));

  // Update selected team
  setSelectedTeams((prev) => ({
    ...prev,
    [id]: checked ? dbTeam : "",
  }));

  // Update DBs state: add if checked, remove if unchecked
  setDBs((prev) => {
    const newDBs = { ...prev };
    if (checked) newDBs[id] = dbTeam;
    else delete newDBs[id];
    return newDBs;
  });

  console.log("ToggleSlider called:", { id, checked, dbTeam });
  console.log("Current DBs state:", { ...DBs, [id]: checked ? dbTeam : null });
};


  const handleSelectChange = (id, value, dbTeam) => {
    setSelectedTeams((prev) => ({ ...prev, [id]: value }));
    setSliderOn((prev) => ({
      ...prev,
      [id]: value === dbTeam,
    }));
  };

  const handlePointSpreadChange = (id, value) => {
    setPointSpreadSelection((prev) => ({ ...prev, [id]: value }));
  };

  // Validation functions
  const validateFirst = () => {
  const msgs = [];
  const firstGames = games.filter(isFirstSubmitGame);
  firstGames.forEach((g) => {
    if (!selectedTeams[g.id]) msgs.push(`Pick the winner for ${g.teams[0]} at ${g.teams[1]}.`);
    if (g.pointSpread?.length && !pointSpreadSelection[g.id]) {
      msgs.push(`Pick the point spread for ${g.teams[0]} at ${g.teams[1]}.`);
    }
  });
  return msgs;
};


  const validateSecond = () => {
    const msgs = [];
    const rest = games.slice(1);

    let missingTeams = 0;
    let missingPS = 0;

    rest.forEach((g) => {
      if (!selectedTeams[g.id]) missingTeams++;
      if (g.pointSpread?.length && !pointSpreadSelection[g.id]) missingPS++;
    });

    if (missingTeams)
      msgs.push(
        missingTeams === 1
          ? "Select the remaining game winner."
          : `Select all remaining game winners (${missingTeams} missing).`
      );

    if (missingPS)
      msgs.push(
        missingPS === 1
          ? "Select the remaining point spread."
          : `Select all remaining point spreads (${missingPS} missing).`
      );

    const driveByOK = games.some((g) => {
      // Check if the selected team for this game matches its DB
      return selectedTeams[g.id] === g.dbTeam;
    });
    if (!driveByOK) msgs.push("Select at least one Drive-By for the week.");


    if (!survivorLost && !survivorPick) msgs.push("Select your Survivor pick.");

    return msgs;
  };

      // Fetch existing picks + survivor pick so the page state reflects previously submitted picks
const loadExistingPicks = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!currentWeek?.weekNumber) return;
    const weekNum = currentWeek.weekNumber;

    // Fetch weekly picks
    const { data: existingData, error: fetchError } = await supabase
  .from("weekly_picks")
  .select("picks, point_spreads, dbs")
  .eq("user_id", user.id)
  .eq("week", weekNum)
  .maybeSingle(); // <-- does not throw if row is missing


    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    // Load existing picks into state
    setSelectedTeams(existingData?.picks || {});
    setPointSpreadSelection(existingData?.point_spreads || {});
    setDBs(existingData?.dbs || {}); // restores DBs correctly

    // Fetch survivor pick separately
    const { data: survivorData } = await supabase
  .from("survivor_picks")
  .select("team")
  .eq("user_id", user.id)
  .eq("week", weekNum)
  .maybeSingle(); // <-- safe if row missing


    setSurvivorPick(survivorData?.team || "");

    // Track previously picked teams to disable them in the survivor select
    if (survivorData?.team) {
      setPickedTeams([survivorData.team]);
    } else {
      setPickedTeams([]);
    }

    // Lock first/second submits based on existing picks
    if (Object.keys(existingData?.picks || {}).length) setSubmittedFirst(true);
    if (Object.keys(existingData?.picks || {}).length === games.length) setSubmittedSecond(true);

  } catch (err) {
    console.error("Error loading existing picks:", err.message || err);
  }
};



    // This calls loadExistingPicks function
    useEffect(() => {
      if (!currentWeek?.weekNumber) return;
      loadExistingPicks();
    }, [currentWeek]);



    // ---- Save picks to Supabase (merge first and second submit) ----
    const saveToSupabase = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No logged-in user");
        if (!currentWeek?.weekNumber) throw new Error("Week number not determined.");
        const weekNum = currentWeek.weekNumber;

        // Fetch existing picks to merge
        const { data: existingData, error: fetchError } = await supabase
          .from("weekly_picks")
          .select("picks, point_spreads, dbs, survivor_pick")
          .eq("user_id", user.id)
          .eq("week", weekNum)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        // Merge picks, point spreads, DBs, survivor
        // Merge everything before upsert
        const mergedPicks = { ...(existingData?.picks || {}), ...selectedTeams };
        const mergedPointSpreads = { ...(existingData?.point_spreads || {}), ...pointSpreadSelection };
        const mergedDBs = { ...(existingData?.dbs || {}), ...DBs };
        const mergedSurvivor = survivorPick || existingData?.survivor_pick || null; // <-- must come before upsert


        // Upsert into weekly_picks
        const { data: upsertData, error: upsertError } = await supabase
          .from("weekly_picks")
          .upsert(
            [{
              user_id: user.id,
              week: weekNum,
              picks: mergedPicks,
              point_spreads: mergedPointSpreads,
              dbs: mergedDBs,
              survivor_pick: mergedSurvivor
            }],
            { onConflict: ["user_id", "week"] }
          )
          .select();

        if (upsertError) throw upsertError;
        console.log("✅ Weekly picks saved/merged:", upsertData);
        

        // Also update survivor_picks table (optional)
        if (!survivorLost && survivorPick) {
          const { data: survivorData, error: survivorError } = await supabase
            .from("survivor_picks")
            .upsert(
              [{ user_id: user.id, week: weekNum, team: survivorPick }],
              { onConflict: ["user_id", "week"] }
            )
            .select();
          if (survivorError) throw survivorError;
          console.log("✅ Survivor pick saved/merged:", survivorData);
        }

      } catch (err) {
        console.error("Error saving picks:", err.message || err);
        throw err;
      }
    };





// ---- Submit First Game(s) ----
const onSubmitFirst = async () => {
  if (firstLocked) return;

  const msgs = validateFirst();
  if (msgs.length) {
    setWarnMessages(msgs);
    setWarnOpen(true);
    return;
  }

  try {
    // Save picks first
    await saveToSupabase();

    // Get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("User email not found");

    // Send confirmation email via Edge Function
    try {
      await fetch("https://pliswiceskoebzcxbgwt.functions.supabase.co/sendPickConfirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: user.email,
    picks: Object.values(selectedTeams),
    pointSpreads: pointSpreadSelection,
    dbs: DBs,
    survivorPick,
    week: currentWeek.weekNumber,
  }),
});


      console.log("✅ Confirmation email sent (First game picks)");
    } catch (err) {
      console.warn("⚠️ Failed to send confirmation email (First game picks):", err);
    }

    // Update UI
    setSubmittedFirst(true);
    setConfirmMsg("First game pick submitted successfully.");
    setConfirmOpen(true);
  } catch (err) {
    console.error("Error saving picks (Submit #1):", err);
    setWarnMessages(["There was a problem saving your pick. Please try again."]);
    setWarnOpen(true);
  }
};



// ---- Submit Rest of Week Picks ----
const onSubmitSecond = async () => {
  if (secondLocked) return;

  const msgs = validateSecond();
  if (msgs.length) {
    setWarnMessages(msgs);
    setWarnOpen(true);
    return;
  }

  try {
    // Save picks first
    await saveToSupabase();

    // Get logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("User email not found");

    // Send confirmation email via Edge Function
    try {
      await fetch("https://pliswiceskoebzcxbgwt.functions.supabase.co/sendPickConfirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: user.email,
    picks: Object.values(selectedTeams),
    pointSpreads: pointSpreadSelection,
    dbs: DBs,
    survivorPick,
    week: currentWeek.weekNumber,
  }),
});


      console.log("✅ Confirmation email sent (Rest of week picks)");
    } catch (err) {
      console.warn("⚠️ Failed to send confirmation email (Rest of week picks):", err);
    }

    // Update UI
    setSubmittedSecond(true);
    setConfirmMsg("Rest of week picks submitted successfully.");
    setConfirmOpen(true);
  } catch (err) {
    console.error("Error saving picks (Submit #2):", err);
    setWarnMessages(["There was a problem saving your picks. Please try again."]);
    setWarnOpen(true);
  }
};





if (!games || !games.length) {
  return <div className="loading-container">Loading games...</div>;
}


  // Helper: shared cell content for DB toggle
  const DBToggle = (game, disabled) =>
    game.dbLabel && (
      <div className={`flex items-center gap-2 ${disabled ? "opacity-50" : ""}`}>
        <span>{game.dbLabel ? `${game.dbLabel}: ${dbTeamCity(game.dbTeam)}` : ""}</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={sliderOn[game.id] || false}
            onChange={(e) => toggleSlider(game.id, e.target.checked, game.dbTeam)}
            className="sr-only peer"
            disabled={disabled}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      </div>
    );

  // Helper for DB team names
      const dbTeamCity = (dbTeam) => {
      const mapping = {
        "Dallas Cowboys": "Dallas",
        "Kansas City Chiefs": "Kansas City",
        "Tampa Bay Buccaneers": "Tampa Bay",
        "Los Angeles Rams": "LA Rams",
        "Los Angeles Chargers": "LA Chargers",
        "New York Giants": "NY Giants",
        "New York Jets": "NY Jets",
        "New Orleans Saints": "New Orleans",
        // add all other teams as needed
      };
      return mapping[dbTeam] || dbTeam.split(" ")[0]; // fallback
    };


  // ---- UI ----
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold mb-4">
          Weekly Picks - Week {currentWeek.weekNumber}
        </h1>

        {/* ===== DESKTOP TABLE ===== */}
        <table className="hidden md:table w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left w-1/4">Matchup</th>
              <th className="p-3 text-left w-1/6">Day</th>
              <th className="p-3 text-left w-1/6">DB</th>
              <th className="p-3 text-left w-1/4">Point Spread</th>
              <th className="p-3 text-left w-1/4">Select</th>
            </tr>
          </thead>
          <tbody>
{(() => {
    const lastFirstIndex = Math.max(
      ...games.map((g, idx) => (["Thu", "Fri", "Sat"].includes(g.day) ? idx : -1))
    );

    // Map all games into rows
    return games.map((game, idx) => {
      const locked = isFirstSubmitGame(game) ? firstLocked : secondLocked;

      return (
        <React.Fragment key={game.id}>
          {/* Matchup row */}
          <tr>
            <td className="p-3">{game.teams[0]} at {game.teams[1]}</td>

            {/* Day */}
            <td className="p-3">
  {game.day /* e.g., "Thu", "Fri", "Sat" */}
</td>



            {/* Drive-By toggle */}
            <td className="p-3">{DBToggle(game, locked)}</td>

            {/* Point Spread select */}
            <td className="p-3">
              {game.pointSpread?.length > 0 && (
                <select
                  className={`border rounded p-1 w-full ${pointSpreadSelection[game.id] ? "bg-yellow-200" : ""}`}
                  value={pointSpreadSelection[game.id] || ""}
                  onChange={(e) => handlePointSpreadChange(game.id, e.target.value)}
                  disabled={locked}
                >
                  <option value="">-- Disruptor Point Spread --</option>
                  {game.pointSpread.map((ps, psIdx) => (
                    <React.Fragment key={psIdx}>
                      <option value={`${game.teams[0]} ${ps >= 0 ? "+" : ""}${ps}`}>
                        {game.teams[0]} {ps >= 0 ? "+" : ""}{ps}
                      </option>
                      <option value={`${game.teams[1]} ${ps <= 0 ? "+" : ""}${-ps}`}>
                        {game.teams[1]} {ps <= 0 ? "+" : ""}{-ps}
                      </option>
                    </React.Fragment>
                  ))}
                </select>
              )}
            </td>

            {/* Team selection */}
            <td className="p-3">
              <select
                className={`border rounded p-1 w-full ${selectedTeams[game.id] ? "bg-yellow-200" : ""}`}
                value={selectedTeams[game.id] || ""}
                onChange={(e) => handleSelectChange(game.id, e.target.value, game.dbTeam)}
                disabled={locked}
              >
                <option value="">-- Select Team --</option>
                {game.teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </td>
          </tr>

          {/* Insert Submit First Game(s) button after the last Thu/Fri/Sat game */}
          {idx === lastFirstIndex && (
            <tr>
              <td colSpan={5} className="p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg bg-white border p-3">
                  <span className="font-semibold">{timeFirst || "Kickoff time TBD"}</span>
                  <button
                    onClick={onSubmitFirst}
                    disabled={firstLocked}
                    className={`px-4 py-2 rounded font-semibold text-white transition
                      ${firstLocked ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 active:bg-green-700"}`}
                  >
                    Submit First Game(s)
                  </button>
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  })()}

            {/* Survivor row after rest of games */}
            {!survivorLost && (
              <tr className="bg-gray-50">
                <td colSpan={4} className="p-3 font-semibold">
                  Survivor Pick:
                </td>
                <td className="p-3">
                  <select
                    className={`border rounded p-1 w-full ${
                      survivorPick ? "bg-yellow-200" : ""
                    } ${secondLocked ? "opacity-60" : ""}`}
                    value={survivorPick}
                    onChange={(e) => setSurvivorPick(e.target.value)}
                    disabled={secondLocked}
                  >
                    <option value="">-- Select Team --</option>
                    {allTeams.map((team) => (
                      <option
                        key={team}
                        value={team}
                        disabled={pickedTeams.includes(team)}
                        style={pickedTeams.includes(team) ? { color: "gray" } : {}}
                      >
                        {team} {pickedTeams.includes(team) ? "(used)" : ""}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )}

            {/* Submit #2 row (timer + button) */}
            {games.length > 1 && (
              <tr>
                <td colSpan={5} className="p-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg bg-white border p-3">
                    <span className="font-semibold">
                      {timeSecond || "Kickoff time TBD"}
                    </span>
                    <button
                      onClick={onSubmitSecond}
                      disabled={secondLocked}
                      className={`px-4 py-2 rounded font-semibold text-white transition
                        ${secondLocked ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"}`}
                    >
                      Submit Rest of Picks
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

{/* ===== MOBILE CARDS ===== */}
<div className="md:hidden space-y-4">
  {(() => {
    // Compute last Thu/Fri/Sat index in sorted games
    const lastFirstIndex = Math.max(
      ...games.map((g, idx) => (["Thu", "Fri", "Sat"].includes(g.day) ? idx : -1))
    );

    return games.map((game, idx) => {
      const locked = isFirstSubmitGame(game) ? firstLocked : secondLocked;

      return (
        <React.Fragment key={game.id}>
          {/* Game card */}
          <div className="bg-white p-3 rounded shadow">
            <div className="font-semibold">{game.teams[0]} at {game.teams[1]}</div>
            <div>Day: {game.day}</div>

            {/* Drive-By toggle */}
            {DBToggle(game, locked)}

            {/* Point Spread select */}
            {game.pointSpread?.length > 0 && (
              <select
                className={`border rounded p-1 w-full mt-2 ${pointSpreadSelection[game.id] ? "bg-yellow-200" : ""}`}
                value={pointSpreadSelection[game.id] || ""}
                onChange={(e) => handlePointSpreadChange(game.id, e.target.value)}
                disabled={locked}
              >
                <option value="">-- Disruptor Point Spread --</option>
                {game.pointSpread.map((ps, psIdx) => (
                  <React.Fragment key={psIdx}>
                    <option value={`${game.teams[0]} ${ps >= 0 ? "+" : ""}${ps}`}>
                      {game.teams[0]} {ps >= 0 ? "+" : ""}{ps}
                    </option>
                    <option value={`${game.teams[1]} ${ps <= 0 ? "+" : ""}${-ps}`}>
                      {game.teams[1]} {ps <= 0 ? "+" : ""}{-ps}
                    </option>
                  </React.Fragment>
                ))}
              </select>
            )}

            {/* Team selection */}
            <select
              className={`border rounded p-1 w-full mt-2 ${selectedTeams[game.id] ? "bg-yellow-200" : ""}`}
              value={selectedTeams[game.id] || ""}
              onChange={(e) => handleSelectChange(game.id, e.target.value, game.dbTeam)}
              disabled={locked}
            >
              <option value="">-- Select Team --</option>
              {game.teams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Insert Submit First Game(s) card after last Thu/Fri/Sat */}
          {idx === lastFirstIndex && (
            <div className="bg-white p-3 rounded shadow flex flex-col gap-3">
              <span className="font-semibold">{timeFirst || "Kickoff time TBD"}</span>
              <button
                onClick={onSubmitFirst}
                disabled={firstLocked}
                className={`w-full px-4 py-2 rounded font-semibold text-white transition
                  ${firstLocked ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 active:bg-green-700"}`}
              >
                Submit First Game(s)
              </button>
            </div>
          )}
        </React.Fragment>
      );
    });
  })()}

  {/* Survivor pick card */}
  {!survivorLost && (
    <div className="bg-white p-3 rounded shadow">
      <div className="font-semibold">Survivor Pick:</div>
      <select
        className={`border rounded p-1 w-full mt-2 ${survivorPick ? "bg-yellow-200" : ""} ${secondLocked ? "opacity-60" : ""}`}
        value={survivorPick}
        onChange={(e) => setSurvivorPick(e.target.value)}
        disabled={secondLocked}
      >
        <option value="">-- Select Team --</option>
        {allTeams.map((team) => (
          <option
            key={team}
            value={team}
            disabled={pickedTeams.includes(team)}
            style={pickedTeams.includes(team) ? { color: "gray" } : {}}
          >
            {team} {pickedTeams.includes(team) ? "(used)" : ""}
          </option>
        ))}
      </select>
    </div>
  )}

  {/* Submit #2 card (rest of week) */}
  {games.length > 1 && (
    <div className="bg-white p-3 rounded shadow flex flex-col gap-3">
      <span className="font-semibold">{timeSecond || "Kickoff time TBD"}</span>
      <button
        onClick={onSubmitSecond}
        disabled={secondLocked}
        className={`w-full px-4 py-2 rounded font-semibold text-white transition
          ${secondLocked ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"}`}
      >
        Submit Rest of Picks
      </button>
    </div>
  )}
</div>

        {/* Warning + Confirmation Modals */}
        <WarningModal
          isOpen={warnOpen}
          messages={warnMessages}
          onClose={() => setWarnOpen(false)}
        />
        <ConfirmationModal
          isOpen={confirmOpen}
          message={confirmMsg}
          onClose={() => setConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
