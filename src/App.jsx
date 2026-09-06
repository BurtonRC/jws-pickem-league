// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { manualWeekNumber } from "./pages/WeeklyPicksPage";
import { CommentsProvider } from "./context/CommentsContext";

import AdminDashboard from "./pages/AdminDashboard";
import AdminWeeklySetupPage from "./pages/AdminWeeklySetupPage";
import AdminLayout from "./components/AdminLayout";
import AdminWednesdayReportPage from "./pages/AdminWednesdayReportPage";
import AdminProcessResultsPage from "./pages/AdminProcessResultsPage";
import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import WeeklyPicksPage from './pages/WeeklyPicksPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SurvivorPage from './pages/SurvivorPage';
import WednesdayReportsPage from './pages/WednesdayReportsPage';
import PaymentsPage from './pages/PaymentsPage';
import LeagueRadarPage from './pages/LeagueRadarPage';
import CommentsPage from "./pages/CommentsPage";
import PicksBoard from "./pages/PicksBoard";
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      if (listener?.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setAdminCheckComplete(true);
        return;
      }

      setAdminCheckComplete(false);

      const { data, error } = await supabase.rpc("is_app_admin");

      if (error) {
        console.error("Admin status check failed:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }

      setAdminCheckComplete(true);
    };

    checkAdminStatus();
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
                <LeaderboardPage />
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/league-radar"
          element={
            user ? (
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
                <LeagueRadarPage user={user} />
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
              <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
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
      <MainLayout loggedIn={!!user} onLogout={handleLogout} user={user} isAdmin={isAdmin}>
        <CommentsPage user={user} />  {/* Pass user here */}
      </MainLayout>
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        <Route
          path="/admin"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !adminCheckComplete ? (
              <div className="min-h-screen flex items-center justify-center">
                Checking access...
              </div>
            ) : isAdmin ? (
              <AdminLayout
                  loggedIn={!!user}
                  onLogout={handleLogout}
                  user={user}
                >
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Navigate to="/home" replace />
            )
          }
        />

        <Route
            path="/admin/wednesday-report"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : !adminCheckComplete ? (
                <div className="min-h-screen flex items-center justify-center">
                  Checking access...
                </div>
              ) : isAdmin ? (
                <AdminLayout
                  loggedIn={!!user}
                  onLogout={handleLogout}
                  user={user}
                >
                  <AdminWednesdayReportPage />
                </AdminLayout>
              ) : (
                <Navigate to="/home" replace />
              )
            }
          />

        <Route
          path="/admin/week-setup"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !adminCheckComplete ? (
              <div className="min-h-screen flex items-center justify-center">
                Checking access...
              </div>
            ) : isAdmin ? (
              <AdminLayout
                  loggedIn={!!user}
                  onLogout={handleLogout}
                  user={user}
                >
                <AdminWeeklySetupPage />
              </AdminLayout>
            ) : (
              <Navigate to="/home" replace />
            )
          }
        />

        <Route
          path="/admin/process-results"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : !adminCheckComplete ? (
              <div className="min-h-screen flex items-center justify-center">
                Checking access...
              </div>
            ) : isAdmin ? (
              <AdminLayout
                  loggedIn={!!user}
                  onLogout={handleLogout}
                  user={user}
                >
                <AdminProcessResultsPage />
              </AdminLayout>
            ) : (
              <Navigate to="/home" replace />
            )
          }
        />
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
