import React, { useState, useEffect } from "react";

// Mock data for development
const mockData = [
  {
    user_name: "Alice Hardy",
    weeks: [
      { normal: 3, db: 2, ps: 1 }, // Week 1
      { normal: 4, db: 1, ps: 2 }, // Week 2
    ],
  },
  {
    user_name: "Bob Uldric",
    weeks: [
      { normal: 2, db: 3, ps: 1 },
      { normal: 5, db: 0, ps: 2 },
    ],
  },
  {
    user_name: "Charlie Brown",
    weeks: [
      { normal: 4, db: 1, ps: 0 },
      { normal: 3, db: 2, ps: 1 },
    ],
  },
];

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // In development, use mock data
    setUsers(mockData);

    // Later: fetch real data from Supabase
    // fetchLeaderboardData();
  }, []);

  const renderWeekTotal = (week) => {
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
