import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // ✅ Step 1: Fetch weekly_results
      const { data: results, error: resultsError } = await supabase
        .from("weekly_results")
        .select("*")
        .order("week");

      if (resultsError) {
        console.error("Error fetching weekly_results:", resultsError);
        return;
      }

      // ✅ Step 2: Fetch profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      // ✅ Step 3: Merge username into results
      const mergedData = results.map(row => ({
        ...row,
        username: profiles.find(p => p.id === row.user_id)?.username || "Unknown"
      }));

      // ✅ Step 4: Group results per user
      const grouped = {};
      mergedData.forEach((row) => {
        const user = row.username;
        if (!grouped[user]) grouped[user] = { user_name: user, weeks: [] };

        grouped[user].weeks[row.week - 1] = {
          normal: row.this_week_score || 0,
          db: row.total_drive_bys || 0,
          ps: row.total_point_spreads || 0,
        };
      });

      // ✅ Step 5: Compute totals per user (normal + DB + PS)
      Object.values(grouped).forEach(user => {
        let total = 0, totalDB = 0, totalPS = 0;
        user.weeks.forEach(week => {
          const normal = week.normal || 0;
          const db = week.db || 0;
          const ps = week.ps || 0;
          total += normal + db + ps;
          totalDB += db;
          totalPS += ps;
        });
        user.total = total;
        user.totalDB = totalDB;
        user.totalPS = totalPS;
      });

      // ✅ Step 6: Sort users descending by total points
      const sortedUsers = Object.values(grouped).sort((a, b) => b.total - a.total);

      setUsers(sortedUsers);
    };

    fetchLeaderboard();
  }, []);

  const renderWeekTotal = (week) => {
    if (!week) return 0;
    return week.normal + week.db + week.ps;
  };

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
                User
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
              const prevWeek = user.weeks[user.weeks.length - 2] || { normal: 0, db: 0, ps: 0 };
              const thisWeek = user.weeks[user.weeks.length - 1] || { normal: 0, db: 0, ps: 0 };

              // ✅ Optional: Highlight top 3 users
              let bgColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
              if (index === 0) bgColor = "bg-[#e5ca3b96] text-black";   // 1st place (gold)
              if (index === 1) bgColor = "bg-[#ebeaea] text-black";   // 2nd place (silver)
              if (index === 2) bgColor = "bg-[#c9a98a9c] text-black";   // 3rd place (bronze)

              return (
                <tr
                  key={user.user_name}
                  className={`${bgColor} border-b hover:bg-gray-200 transition-colors duration-200`}
                >
                  <td className="p-2 sm:p-3 text-left truncate">{user.user_name}</td>
                  <td className="p-2 sm:p-3 text-right">{renderWeekTotal(prevWeek)}</td>
                  <td className="p-2 sm:p-3 text-right">{renderWeekTotal(thisWeek)}</td>
                  <td className="p-2 sm:p-3 text-right">{user.total}</td>
                  <td className="p-2 sm:p-3 text-right">{user.totalDB}</td>
                  <td className="p-2 sm:p-3 text-right">{user.totalPS}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
