import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import teamLogos from "../data/teamLogos.json"; // must be valid JSON

export default function SurvivorPage() {
  const mockSurvivorData = {
    Alice: { 1: "Green Bay Packers", 2: "Buffalo Bills", 3: "Philadelphia Eagles" },
    Bob: { 1: "Dallas Cowboys", 2: "Kansas City Chiefs", 3: "San Francisco 49ers", 4: "Miami Dolphins" },
    Charlie: { 1: "Chicago Bears", 2: "New York Giants" }
  };

  const [survivorData, setSurvivorData] = useState({});
  const [maxWeek, setMaxWeek] = useState(1);
  const [useMock, setUseMock] = useState(true); // toggle for testing

  useEffect(() => {
    if (useMock) {
      setSurvivorData(mockSurvivorData);
      const maxMockWeek = Math.max(
        ...Object.values(mockSurvivorData).flatMap((picks) =>
          Object.keys(picks).map(Number)
        )
      );
      setMaxWeek(maxMockWeek);
      return;
    }

    const fetchSurvivorData = async () => {
      const { data, error } = await supabase
        .from("survivor_picks")
        .select("user_id, week, team, profiles(username)")
        .order("week");

      if (error) {
        console.error("Error fetching survivor picks:", error);
        return;
      }

      const grouped = {};
      let maxWeekFound = 1;

      data.forEach((pick) => {
        const user = pick.profiles?.username || "Unknown";
        if (!grouped[user]) grouped[user] = {};
        grouped[user][pick.week] = pick.team;
        if (pick.week > maxWeekFound) maxWeekFound = pick.week;
      });

      setSurvivorData(grouped);
      setMaxWeek(maxWeekFound);
    };

    fetchSurvivorData();
  }, [useMock]);

  if (!survivorData || Object.keys(survivorData).length === 0) {
    return <div className="p-6">No survivor picks yet.</div>;
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
                const team = picks[weekNum];
                const logo = team ? teamLogos[team] : null;
                return (
                  <td key={weekNum} className="p-2 text-center">
                    {logo ? (
                      <img
                        src={logo}
                        alt={team}
                        className="w-12 h-12 mx-auto"
                      />
                    ) : (
                      ""
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
