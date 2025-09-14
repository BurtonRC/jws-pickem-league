import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Scoreboard from "./Scoreboard";
import { supabase } from "../supabaseClient"; // import your Supabase client

export default function MainLayout({ children, loggedIn, onLogout, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null); // store Supabase profile

  // Collapse scoreboard on scroll
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch the user's profile from Supabase
  useEffect(() => {
    console.log("MainLayout useEffect user:", user);

    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

        console.log("Supabase profile fetch:", data, error);

      if (error) {
        console.error("Error fetching profile:", error.message);
      } else {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SCOREBOARD — VERY TOP */}
      <Scoreboard collapsed={collapsed} />

      {/* NAVBAR — STICKS WHEN SCOREBOARD COLLAPSES */}
      {/* IMPORTANT: Navbar itself must NOT be `fixed` */}
      <div className="sticky top-0 z-50">
        <Navbar
          loggedIn={loggedIn}
          onLogout={onLogout}
          user={profile} // pass fetched profile to Navbar
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>

      {/* PAGE CONTENT */}
      <main className="w-full mx-auto p-6 space-y-8">
        {children}
      </main>
    </div>
  );
}
