import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "@/components/PageHeader";

export default function SurvivorPage() {
  const [survivorData, setSurvivorData] = useState({});
  const [maxWeek, setMaxWeek] = useState(1);
  const [teamLogos, setTeamLogos] = useState({});
  const WINNER_ICON = "logos/winner.png";

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
        .select("user_id, week, team, result, username")
        .order("week");

      if (error) {
        console.error("Error fetching survivor picks:", error);
        return;
      }

      // Group picks by username
      const grouped = {};
      let maxWeekFound = 1;

      picks.forEach((pick) => {
        const user = pick.username || "Unknown";
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

  // Determine survivor winner(s): players with NO losses
const winners = Object.keys(survivorData).filter((user) => {
  const weeks = survivorData[user];
  return Object.values(weeks).every((p) => p.result === "win");
});


  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 pt-6">
  <div className="w-full max-w-5xl mx-auto space-y-4">
    <PageHeader>Survivor Picks</PageHeader>

    {/* ✅ Responsive scroll wrapper */}
    <div className="overflow-x-auto sm:overflow-x-visible border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full sm:table-fixed border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-center sticky left-0 bg-gray-100 z-10">
              User
            </th>
            {Array.from({ length: maxWeek }, (_, i) => (
              <th key={i + 1} className="p-2 text-center">
                Week {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(survivorData)
            .sort()
            .map((user) => {
              const picks = survivorData[user];
              let eliminated = false;

              return (
                <tr
                  key={user}
                  className={`border-b border-gray-300 ${
                    winners.includes(user) ? "bg-[#efe4b1]" : ""
                  }`}
                >
                  <td
                    className={`p-2 font-semibold text-center sticky left-0 z-10 ${
                      winners.includes(user)
                        ? "bg-[#dfcd79]"
                        : "bg-white"
                    }`}
                  >
                    {user}
                  </td>

                  {Array.from({ length: maxWeek }, (_, i) => {
                    const weekNum = i + 1;
                    const pick = picks[weekNum];

                    if (!pick || pick.result === "pending")
                      return (
                        <td key={weekNum} className="p-2 text-center" />
                      );

                    const { team, result } = pick;
                    const logo = team ? teamLogos[team] : null;
                    const isDimmed = eliminated || result === "loss";
                    if (result === "loss") eliminated = true;

                    return (
                      <td key={weekNum} className="p-2 text-center">
                        {/* Winner special icon on final winning week */}
                        {winners.includes(user) && weekNum === Object.keys(picks).length ? (
                          <img
                            src={`${import.meta.env.BASE_URL}${WINNER_ICON}`}
                            alt="Winner"
                            className="w-10 h-10 mx-auto"
                          />
                        ) : logo ? (
                          <img
                            src={`${import.meta.env.BASE_URL}${logo}`}
                            alt={team}
                            className={`w-10 h-10 mx-auto ${isDimmed ? "opacity-20" : ""}`}
                          />
                        ) : (
                          team || ""
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </div>
</div>
  );
}
