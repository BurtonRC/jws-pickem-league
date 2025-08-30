import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("weekly_results")
        .select("week, this_week_score, prev_week_score, overall_score, total_drive_bys, total_point_spreads, profiles(username)")
        .order("week");

      if (error) {
        console.error("Error fetching leaderboard:", error);
        return;
      }

      // Group results per user
      const grouped = {};
      data.forEach((row) => {
        const user = row.profiles?.username || "Unknown";
        if (!grouped[user]) grouped[user] = { user_name: user, weeks: [] };
        grouped[user].weeks[row.week - 1] = {
          normal: row.this_week_score, // your schema can split this if needed
          db: row.total_drive_bys,
          ps: row.total_point_spreads,
        };
      });

      setUsers(Object.values(grouped));
    };

    fetchLeaderboard();
  }, []);

  const renderWeekTotal = (week) => {
    if (!week) return 0;
    return week.normal + week.db + week.ps;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full md:w-[90%] max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border-b">User</th>
              <th className="p-3 border-b">Prev Week Score</th>
              <th className="p-3 border-b">This Week Score</th>
              <th className="p-3 border-b">Total</th>
              <th className="p-3 border-b">DB</th>
              <th className="p-3 border-b">PS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const prevWeek = user.weeks[user.weeks.length - 2] || { normal: 0, db: 0, ps: 0 };
              const thisWeek = user.weeks[user.weeks.length - 1] || { normal: 0, db: 0, ps: 0 };
              const total = user.weeks.reduce((sum, week) => sum + week.normal + week.db + week.ps, 0);
              const totalDB = user.weeks.reduce((sum, week) => sum + week.db, 0);
              const totalPS = user.weeks.reduce((sum, week) => sum + week.ps, 0);

              return (
                <tr key={user.user_name} className="border-b">
                  <td className="p-3">{user.user_name}</td>
                  <td className="p-3">{renderWeekTotal(prevWeek)}</td>
                  <td className="p-3">{renderWeekTotal(thisWeek)}</td>
                  <td className="p-3">{total}</td>
                  <td className="p-3">{totalDB}</td>
                  <td className="p-3">{totalPS}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
