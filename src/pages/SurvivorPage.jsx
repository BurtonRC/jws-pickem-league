import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function SurvivorPage() {
  const [survivorData, setSurvivorData] = useState({});
  const [maxWeek, setMaxWeek] = useState(1);
  const [teamLogos, setTeamLogos] = useState({});

  // ✅ Load team logos from public/teamLogos.json
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}teamLogos.json`)
      .then((res) => res.json())
      .then((data) => setTeamLogos(data))
      .catch((err) => console.error("Error loading team logos:", err));
  }, []);

  // ✅ Fetch survivor picks from Supabase
useEffect(() => {
  const fetchSurvivorData = async () => {
    // ✅ fetch survivor picks without joining profiles
    const { data: picks, error } = await supabase
      .from("survivor_picks")
      .select("user_id, week, team, result")
      .order("week");

    if (error) {
      console.error("Error fetching survivor picks:", error);
      return;
    }

    // ✅ fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }

    // ✅ merge username into survivor picks
    const grouped = {};
    let maxWeekFound = 1;

    picks.forEach((pick) => {
      const user = profiles.find((p) => p.id === pick.user_id)?.username || "Unknown";
      if (!grouped[user]) grouped[user] = {};
      grouped[user][pick.week] = {
        team: pick.team,
        result: pick.result
      };
      if (pick.week > maxWeekFound) maxWeekFound = pick.week;
    });

    setSurvivorData(grouped);
    setMaxWeek(maxWeekFound);
  };

  fetchSurvivorData();
}, []);


  if (!survivorData || Object.keys(survivorData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-start pt-40 bg-gray-50 min-h-screen">
        <p className="text-xl font-semibold text-gray-700">
          No survivor picks yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Survivor Picks</h1>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-center">User</th>
              {Array.from({ length: maxWeek }, (_, i) => (
                <th key={i + 1} className="p-2 text-center">
                  Week {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(survivorData).map(([user, picks]) => (
              <tr key={user} className="border-b border-gray-300">
                <td className="p-2 font-semibold text-center">{user}</td>
                {Array.from({ length: maxWeek }, (_, i) => {
                  const weekNum = i + 1;
                  const pick = picks[weekNum];

                  // ✅ Only show picks that are resolved ('win' or 'loss')
                  if (!pick || pick.result === "pending")
                    return <td key={weekNum} className="p-2 text-center" />;

                  const { team, result } = pick;
                  const logo = team ? teamLogos[team] : null;

                  // Dim only the losing pick
                  const isDimmed = result === "loss";

                  return (
                    <td key={weekNum} className="p-2 text-center">
                      {logo ? (
                        <img
                          src={`${import.meta.env.BASE_URL}${logo}`}
                          alt={team}
                          className={`w-12 h-12 mx-auto ${isDimmed ? "opacity-20" : ""}`}
                        />
                      ) : (
                        team || ""
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
