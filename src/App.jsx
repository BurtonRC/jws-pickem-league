import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import WeeklyPicksPage from './pages/WeeklyPicksPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SurvivorPage from './pages/SurvivorPage';
import WednesdayReportsPage from './pages/WednesdayReportsPage';
import PaymentsPage from './pages/PaymentsPage';
import SignUp from './pages/SignUp';
import Login from './pages/Login';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      if (listener?.subscription) listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  return (
    <>
      <Navbar loggedIn={!!user} onLogout={handleLogout} />
      <div className="pt-28">
        <div className="max-w-6xl mx-auto px-4">
          <Routes>
            <Route path="/home" element={user ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/picks" element={user ? <WeeklyPicksPage /> : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={user ? <LeaderboardPage /> : <Navigate to="/login" />} />
            <Route path="/survivor" element={user ? <SurvivorPage /> : <Navigate to="/login" />} />
            <Route path="/wednesday-reports" element={user ? <WednesdayReportsPage /> : <Navigate to="/login" />} />
            <Route path="/payments" element={user ? <PaymentsPage /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </>
  );
}
