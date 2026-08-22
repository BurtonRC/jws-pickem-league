import React, { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import Scoreboard from "./Scoreboard";
import { supabase } from "../supabaseClient";

export default function AdminLayout({
  children,
  loggedIn,
  onLogout,
  user,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // Collapse scoreboard on scroll — same as MainLayout
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 50);

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch profile — same as MainLayout
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("AdminLayout profile fetch:", error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  const adminLinks = [
    {
      to: "/admin/wednesday-report",
      label: "Wednesday Report",
    },
    {
      to: "/admin/week-setup",
      label: "Week Setup",
    },
    {
      to: "/admin/process-results",
      label: "Process Results",
    },
  ];

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* SCOREBOARD — SAME AS LEAGUE */}
      <Scoreboard collapsed={collapsed} />

      {/* ADMIN NAVBAR */}
      <div className="sticky top-0 z-50">
        <nav className="relative w-full bg-gray-900 text-white shadow">
          <div
            className="w-full max-w-[1230px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8"
            style={{ height: "50px" }}
          >

            {/* LEFT: LOGO + ADMIN LINKS */}
            <div className="flex items-center flex-1 min-w-0">

              <Link
                to="/home"
                aria-label="Home"
                className="flex-shrink-0"
              >
                <img
                  src={logoPath}
                  alt="JWs PickEm League Logo"
                  className="h-10 sm:h-12 md:h-[4.4rem] w-auto"
                />
              </Link>

              <div className="hidden md:flex items-center ml-6 flex-shrink overflow-hidden">

                {adminLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `relative flex items-center px-3 py-2 transition-colors ${
                        isActive
                          ? "text-[#f1f2f3] after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-0 after:border-l-[9px] after:border-r-[9px] after:border-b-[9px] after:border-l-transparent after:border-r-transparent after:border-b-white"
                          : "hover:text-[#f1f2f3]"
                      }`
                    }
                    style={{
                      paddingTop: "17px",
                      paddingBottom: "17px",
                    }}
                  >
                    {link.label}
                  </NavLink>
                ))}

                {/* BACK TO LEAGUE */}
                <Link
                  to="/home"
                  className="relative flex items-center px-3 py-2 transition-colors hover:text-[#f1f2f3]"
                  style={{
                    paddingTop: "17px",
                    paddingBottom: "17px",
                  }}
                >
                  Back to League
                </Link>

              </div>
            </div>

            {/* USER BADGE */}
            {loggedIn && (
              <div className="relative ml-auto hidden md:block">

                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white font-semibold text-sm focus:outline-none"
                  title={profile?.username}
                >
                  {profile?.username
                    ?.split(" ")
                    .map((n) => n[0].toUpperCase())
                    .join("")}
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full w-32 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 transform transition-all duration-200 ease-out opacity-0 scale-95 animate-dropdown translate-y-5"
                    style={{ animationFillMode: "forwards" }}
                  >
                    <button
                      onClick={() => {
                        onLogout();
                        setMenuOpen(false);
                      }}
                      className="block w-full text-center px-4 py-2 font-regular"
                      style={{
                        color: "#2dcbff",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.color = "#daf6ffff")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.color = "#2dcbff")
                      }
                    >
                      Sign Out
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* MOBILE USER BADGE */}
            {loggedIn && (
              <button
                className="md:hidden focus:outline-none ml-auto"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle Menu"
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white font-semibold text-sm"
                  title={profile?.username}
                >
                  {profile?.username
                    ?.split(" ")
                    .map((n) => n[0].toUpperCase())
                    .join("")}
                </div>
              </button>
            )}

          </div>

          {/* MOBILE ADMIN MENU */}
          {loggedIn && menuOpen && (
            <div className="md:hidden bg-gray-800 border-t border-gray-700">
              <div className="max-w-[70%] mx-auto px-4 py-2 space-y-2">

                {adminLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block py-2 ${
                        isActive
                          ? "text-[#f1f2f3]"
                          : "hover:text-[#f1f2f3]"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}

                <Link
                  to="/home"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 hover:text-[#f1f2f3]"
                >
                  Back to League
                </Link>

                <button
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-0 py-2 font-regular"
                  style={{
                    color: "#2dcbff",
                  }}
                >
                  Sign Out
                </button>

              </div>
            </div>
          )}
        </nav>
      </div>

      {/* ADMIN PAGE CONTENT */}
      <main className="min-h-screen bg-gray-50 px-6 pt-12">
  <div className="w-full max-w-5xl mx-auto space-y-4">
    {children}
  </div>
</main>

    </div>
  );
}