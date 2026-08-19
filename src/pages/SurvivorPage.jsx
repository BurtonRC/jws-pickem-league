import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "@/components/PageHeader";

const CURRENT_SEASON = 2025;
const WINNER_ICON = "logos/winner.png";
const FINAL_SURVIVOR_WEEK = 13;

export default function SurvivorPage() {
  const [survivorData, setSurvivorData] = useState({});
  const [maxWeek, setMaxWeek] = useState(4);
  const [teamLogos, setTeamLogos] = useState({});

  // Load team logos
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}teamLogos.json`)
      .then((res) => res.json())
      .then((data) => setTeamLogos(data))
      .catch((err) =>
        console.error("Error loading team logos:", err)
      );
  }, []);

  // Fetch survivor picks for the CURRENT SEASON only
  useEffect(() => {
    const fetchSurvivorData = async () => {
      const { data: picks, error } = await supabase
        .from("survivor_picks")
        .select("user_id, season, week, team, result, username")
        .eq("season", CURRENT_SEASON)
        .order("week");

      if (error) {
        console.error("Error fetching survivor picks:", error);
        return;
      }

      const grouped = {};

      picks.forEach((pick) => {
        const user = pick.username || "Unknown";

        if (!grouped[user]) {
          grouped[user] = {};
        }

        grouped[user][pick.week] = {
          team: pick.team,
          result: pick.result,
        };
      });

      setSurvivorData(grouped);

      // Show Survivor weeks in blocks of 4.
      // 1-4, 5-8, 9-12, then the final week(s).
      const latestWeek = picks.reduce(
        (max, pick) => Math.max(max, pick.week),
        0
      );

      let displayWeek = 4;

      if (latestWeek > 4) {
        displayWeek = Math.ceil(latestWeek / 4) * 4;
      }

      displayWeek = Math.min(displayWeek, FINAL_SURVIVOR_WEEK);

      setMaxWeek(displayWeek);
    };

    fetchSurvivorData();
  }, []);

  if (
    !survivorData ||
    Object.keys(survivorData).length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-start pt-40 bg-gray-50 min-h-screen">
        <p className="text-xl font-semibold text-gray-700">
          No survivor picks yet for {CURRENT_SEASON}.
        </p>
      </div>
    );
  }

  // Determine survivor winner(s)
  const winners = Object.keys(survivorData).filter((user) => {
    const weeks = survivorData[user];

    for (let w = 1; w <= FINAL_SURVIVOR_WEEK; w++) {
      const p = weeks[w];

      if (!p || p.result !== "win") {
        return false;
      }
    }

    return true;
  });

  console.log(
    `SURVIVOR WINNERS ${CURRENT_SEASON}:`,
    winners
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 pt-6">
      <div className="w-full max-w-5xl mx-auto space-y-4">

        <PageHeader>
          {CURRENT_SEASON} &nbsp;&nbsp; Survivor Picks
        </PageHeader>

        <div className="overflow-x-auto sm:overflow-x-visible border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full sm:table-fixed border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-center sticky left-0 bg-gray-100 z-10">
                  User
                </th>

                {Array.from(
                  { length: maxWeek },
                  (_, i) => (
                    <th
                      key={i + 1}
                      className="p-2 text-center"
                    >
                      Week {i + 1}
                    </th>
                  )
                )}
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
                        winners.includes(user)
                          ? "bg-[#efe4b1]"
                          : ""
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

                      {Array.from(
                        { length: maxWeek },
                        (_, i) => {
                          const weekNum = i + 1;
                          const pick = picks[weekNum];

                          if (!pick) {
                            return (
                              <td
                                key={weekNum}
                                className="p-2 text-center"
                              />
                            );
                          }

                          const { team, result } = pick;

                          const logo = team
                            ? teamLogos[team]
                            : null;

                          const isDimmed =
                            eliminated ||
                            result === "loss";

                          if (result === "loss") {
                            eliminated = true;
                          }

                          return (
                            <td
                              key={weekNum}
                              className="p-2 text-center"
                            >
                              {winners.includes(user) &&
                              weekNum === FINAL_SURVIVOR_WEEK ? (
                                <img
                                  src={`${import.meta.env.BASE_URL}${WINNER_ICON}`}
                                  alt="Winner"
                                  className="w-10 h-10 mx-auto"
                                />
                              ) : logo ? (
                                <img
                                  src={`${import.meta.env.BASE_URL}${logo}`}
                                  alt={team}
                                  className={`w-10 h-10 mx-auto ${
                                    isDimmed
                                      ? "opacity-20"
                                      : ""
                                  }`}
                                />
                              ) : (
                                team || ""
                              )}
                            </td>
                          );
                        }
                      )}
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