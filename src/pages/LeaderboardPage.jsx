import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // ✅ Fetch leaderboard directly from weekly_results
      const { data: rows, error } = await supabase
        .from("weekly_results")
        .select(
          "user_id, username, week, prev_week_score, this_week_score, overall_score, total_drive_bys, total_point_spreads"
        );

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return;
      }

      // ✅ Group by username (latest week only)
      const grouped = {};
      rows.forEach((row) => {
        if (!grouped[row.username] || row.week > grouped[row.username].week) {
          grouped[row.username] = {
            username: row.username,
            prevWeek: row.prev_week_score ?? 0,
            thisWeek: row.this_week_score ?? 0,
            total: row.overall_score ?? 0,        // ✅ overall_score as Total
            db: row.total_drive_bys ?? 0,
            ps: row.total_point_spreads ?? 0,     // ✅ total_point_spreads as PS
            week: row.week,
          };
        }
      });

      // ✅ Sort descending by total points (highest → lowest)
      const sortedUsers = Object.values(grouped).sort((a, b) => b.total - a.total);

      setUsers(sortedUsers);
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-1 sm:px-6 md:px-8">
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center md:text-left">
          Leaderboard
        </h1>

        <table className="w-full table-fixed border-collapse text-center text-sm sm:text-base">
          <thead>
            <tr className="bg-gray-100 sticky top-0 z-10">
              <th className="p-3 border-b w-2/6 text-left font-semibold uppercase tracking-wide text-sm sm:text-base">
                Name
              </th>
              <th className="p-3 border-b w-1/6 text-right font-semibold uppercase tracking-wide text-sm sm:text-base">
                Prev Week
              </th>
              <th className="p-3 border-b w-1/6 text-right font-semibold uppercase tracking-wide text-sm sm:text-base">
                This Week
              </th>
              <th className="p-3 border-b w-1/6 text-right font-semibold uppercase tracking-wide text-sm sm:text-base">
                Total
              </th>
              <th className="p-3 border-b w-1/12 text-right font-semibold uppercase tracking-wide text-sm sm:text-base">
                DB
              </th>
              <th className="p-3 border-b w-2/6 text-right font-semibold uppercase tracking-wide text-sm sm:text-base">
                PS
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              let bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
              if (index === 0) bgColor = "bg-[#e5ca3b96] text-black"; // gold
              if (index === 1) bgColor = "bg-[#ebeaea] text-black";   // silver
              if (index === 2) bgColor = "bg-[#c9a98a9c] text-black"; // bronze

              return (
                <tr
                  key={user.username}
                  className={`${bgColor} border-b hover:bg-gray-200 transition-colors duration-200`}
                >
                  <td className="p-2 sm:p-3 text-left truncate">{user.username}</td>
                  <td className="p-2 sm:p-3 text-right">{user.prevWeek}</td>
                  <td className="p-2 sm:p-3 text-right">{user.thisWeek}</td>
                  <td className="p-2 sm:p-3 text-right">{user.total}</td>
                  <td className="p-2 sm:p-3 text-right">{user.db}</td>
                  <td className="p-2 sm:p-3 text-right">{user.ps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
