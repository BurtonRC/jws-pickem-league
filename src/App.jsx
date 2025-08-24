// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import MainLayout from './components/MainLayout';
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
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
      />

      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Pages with MainLayout (Scoreboard + Navbar + Page Content) */}
      <Route
        path="/home"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <HomePage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/picks"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <WeeklyPicksPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/leaderboard"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <LeaderboardPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/survivor"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <SurvivorPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/wednesday-reports"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <WednesdayReportsPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/payments"
        element={
          user ? (
            <MainLayout loggedIn={!!user} onLogout={handleLogout}>
              <PaymentsPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
