import React, { useEffect, useState } from "react";
import gamesData from "../data/nfl_schedule_2025.json";
import { supabase } from "../supabaseClient";

export default function WeeklyPicksPage() {
  const [selectedTeams, setSelectedTeams] = useState({});
  const [sliderOn, setSliderOn] = useState({});
  const [pointSpreadSelection, setPointSpreadSelection] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Survivor states
  const [survivorPick, setSurvivorPick] = useState("");
  const [survivorLost, setSurvivorLost] = useState(false);
  const [pickedTeams, setPickedTeams] = useState([]);
  

  const today = new Date();
  const currentWeek =
    gamesData.weeks.find((week) => {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      return today >= start && today <= end;
    }) || gamesData.weeks[0];

  const games = currentWeek?.games || [];
  const kickoffUTC = currentWeek?.kickoffUTC ? new Date(currentWeek.kickoffUTC) : null;
  const picksOpen = kickoffUTC ? new Date() < kickoffUTC : true;

  // Derive all teams from schedule
  const allTeams = Array.from(
    new Set(gamesData.weeks.flatMap((week) => week.games.flatMap((game) => game.teams)))
  );

  useEffect(() => {
    if (!kickoffUTC) {
      setTimeRemaining(null);
      return;
    }
    const updateCountdown = () => {
      const diff = kickoffUTC - new Date();
      if (diff <= 0) {
        setTimeRemaining("Kickoff reached!");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [kickoffUTC]);

  const canSubmit = () => {
    const atLeastOneDBOn = Object.entries(sliderOn).some(([id, val]) => {
      if (!val) return false;
      const game = games.find((g) => g.id === Number(id));
      if (!game) return false;
      return selectedTeams[id] === game.dbTeam;
    });

    const allPointSpreadsSelected = games.every(
      (game) =>
        !game.pointSpread ||
        game.pointSpread.length === 0 ||
        (pointSpreadSelection[game.id] && pointSpreadSelection[game.id] !== "")
    );

    const allTeamsSelected = games.every(
      (game) => selectedTeams[game.id] && selectedTeams[game.id] !== ""
    );

    // Survivor pick must also be selected if not lost
    const survivorOk = survivorLost || survivorPick !== "";

    return atLeastOneDBOn && allPointSpreadsSelected && allTeamsSelected && survivorOk && picksOpen;
  };

  const toggleSlider = (id, checked, dbTeam) => {
    setSliderOn((prev) => ({ ...prev, [id]: checked }));
    setSelectedTeams((prev) => ({
      ...prev,
      [id]: checked ? dbTeam : "",
    }));
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

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitted(true);

    // Save to Supabase
    try {
      // Weekly picks
      await supabase.from("weekly_picks").upsert([
        {
          user_id: supabase.auth.user()?.id,
          week: currentWeek.weekNumber,
          picks: selectedTeams,
          point_spreads: pointSpreadSelection,
        },
      ]);

      // Survivor pick
      if (!survivorLost && survivorPick) {
        await supabase.from("survivor_picks").upsert([
          {
            user_id: supabase.auth.user()?.id,
            week: currentWeek.weekNumber,
            team: survivorPick,
          },
        ]);
      }
    } catch (err) {
      console.error("Error saving picks:", err);
    }
  };

  const inputsDisabled = !picksOpen || submitted;

  if (!currentWeek) return <div>No games for this week.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold mb-4">Weekly Picks - Week {currentWeek.weekNumber}</h1>

        {timeRemaining && (
          <p className="mb-2 font-semibold">Time until kickoff: {timeRemaining}</p>
        )}
        {!picksOpen && (
          <p className="mb-4 text-red-600 font-bold">Picks are closed for this week.</p>
        )}

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
  {games.map((game) => (
    <tr key={game.id}>
      <td className="p-3">{game.teams[0]} at {game.teams[1]}</td>
      <td className="p-3">{game.day}</td>
      <td className="p-3">
        {game.dbLabel && (
          <div className="flex items-center gap-2">
            <span>{game.dbLabel}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sliderOn[game.id] || false}
                onChange={(e) => toggleSlider(game.id, e.target.checked, game.dbTeam)}
                className="sr-only peer"
                disabled={inputsDisabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        )}
      </td>
      <td className="p-3">
        {game.pointSpread && game.pointSpread.length > 0 && (
          <select
            className={`border rounded p-1 w-full ${pointSpreadSelection[game.id] ? "bg-yellow-200" : ""}`}
            value={pointSpreadSelection[game.id] || ""}
            onChange={(e) => handlePointSpreadChange(game.id, e.target.value)}
            disabled={inputsDisabled}
          >
            <option value="">-- Select Cover --</option>
            {game.pointSpread.map((ps, idx) => <option key={idx} value={ps}>{ps}</option>)}
          </select>
        )}
      </td>
      <td className="p-3">
        <select
          className={`border rounded p-1 w-full ${selectedTeams[game.id] ? "bg-yellow-200" : ""}`}
          value={selectedTeams[game.id] || ""}
          onChange={(e) => handleSelectChange(game.id, e.target.value, game.dbTeam)}
          disabled={inputsDisabled}
        >
          <option value="">-- Select Team --</option>
          {game.teams.map((team) => <option key={team} value={team}>{team}</option>)}
        </select>
      </td>
    </tr>
  ))}

  {/* Survivor Pick Row */}
  {!survivorLost && (
    <tr className="bg-gray-50">
      <td colSpan={4} className="p-3 font-semibold">Survivor Pick:</td>
      <td className="p-3">
        <select
          className={`border rounded p-1 w-full ${survivorPick ? "bg-yellow-200" : ""}`}
          value={survivorPick}
          onChange={(e) => setSurvivorPick(e.target.value)}
          disabled={inputsDisabled}
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
</tbody>

        </table>

        {/* Mobile layout */}
        <div className="md:hidden space-y-4">
  {games.map((game) => (
    <div key={game.id} className="bg-white p-3 rounded shadow">
      <div className="font-semibold">{game.teams[0]} at {game.teams[1]}</div>
      <div>Day: {game.day}</div>
      {game.dbLabel && (
        <div className="flex items-center gap-2">
          <span>{game.dbLabel}</span>
          <input
            type="checkbox"
            checked={sliderOn[game.id] || false}
            onChange={(e) => toggleSlider(game.id, e.target.checked, game.dbTeam)}
            disabled={inputsDisabled}
          />
        </div>
      )}
      {game.pointSpread && game.pointSpread.length > 0 && (
        <select
          className={`border rounded p-1 w-full mt-2 ${pointSpreadSelection[game.id] ? "bg-yellow-200" : ""}`}
          value={pointSpreadSelection[game.id] || ""}
          onChange={(e) => handlePointSpreadChange(game.id, e.target.value)}
          disabled={inputsDisabled}
        >
          <option value="">-- Select Cover --</option>
          {game.pointSpread.map((ps, idx) => <option key={idx} value={ps}>{ps}</option>)}
        </select>
      )}
      <select
        className={`border rounded p-1 w-full mt-2 ${selectedTeams[game.id] ? "bg-yellow-200" : ""}`}
        value={selectedTeams[game.id] || ""}
        onChange={(e) => handleSelectChange(game.id, e.target.value, game.dbTeam)}
        disabled={inputsDisabled}
      >
        <option value="">-- Select Team --</option>
        {game.teams.map((team) => <option key={team} value={team}>{team}</option>)}
      </select>
    </div>
  ))}

  {!survivorLost && (
    <div className="bg-white p-3 rounded shadow">
      <div className="font-semibold">Survivor Pick:</div>
      <select
        className={`border rounded p-1 w-full mt-2 ${survivorPick ? "bg-yellow-200" : ""}`}
        value={survivorPick}
        onChange={(e) => setSurvivorPick(e.target.value)}
        disabled={inputsDisabled}
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
</div>


        <button
          className={`mt-4 px-4 py-2 rounded bg-green-500 text-white font-semibold ${canSubmit() ? "" : "opacity-50 cursor-not-allowed"}`}
          onClick={handleSubmit}
          disabled={!canSubmit()}
        >
          Submit Picks
        </button>
      </div>
    </div>
  );
}
