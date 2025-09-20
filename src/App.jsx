// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { manualWeekNumber } from "./pages/WeeklyPicksPage";
import { CommentsProvider } from "./context/CommentsContext";

import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import WeeklyPicksPage from './pages/WeeklyPicksPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SurvivorPage from './pages/SurvivorPage';
import WednesdayReportsPage from './pages/WednesdayReportsPage';
import PaymentsPage from './pages/PaymentsPage';
import CommentsPage from "./pages/CommentsPage";
import PicksBoard from "./pages/PicksBoard";
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes (login/logout)
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
     <ScrollToTop />
    <CommentsProvider> 
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
        />

        {/* Auth pages (no MainLayout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Pages with MainLayout (Scoreboard + Navbar + Page Content) */}
        <Route
          path="/home"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <HomePage user={user} />  {/* Pass user here */}
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/picks"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <WeeklyPicksPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/leaderboard"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <LeaderboardPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/survivor"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <SurvivorPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/wednesday-reports"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <WednesdayReportsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/payments"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <PaymentsPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/picks-board"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
                <PicksBoard weekNumber={manualWeekNumber} />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />




        {/* Comments Page */}
        <Route
  path="/comments"
  element={
    user ? (
      <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user}>
        <CommentsPage user={user} />  {/* Pass user here */}
      </MainLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Catch-all redirect */}
        <Route
          path="*"
          element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </CommentsProvider>
    </>
  );
}
