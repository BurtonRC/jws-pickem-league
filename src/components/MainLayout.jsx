import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Scoreboard from "./Scoreboard";

export default function MainLayout({ children, loggedIn, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapse scoreboard on scroll
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SCOREBOARD — VERY TOP */}
      <Scoreboard collapsed={collapsed} />

      {/* NAVBAR — STICKS WHEN SCOREBOARD COLLAPSES */}
      {/* IMPORTANT: Navbar itself must NOT be `fixed` */}
      <div className="sticky top-0 z-50">
        <Navbar loggedIn={loggedIn} onLogout={onLogout} />
      </div>

      {/* PAGE CONTENT */}
      <main className="w-full mx-auto p-6 space-y-8">
        {children}
      </main>
    </div>
  );
}
