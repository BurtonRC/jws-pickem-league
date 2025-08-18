import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ loggedIn, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const hoverColorClass = "hover:text-[#b1945a]";

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 text-white shadow-md z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center p-4">

        {/* Left side with logo */}
        <div className="flex items-center space-x-4">
          <Link to="/home">
            <img
              src="src/assets/pickem_logo.png"
              alt="Site Logo"
              className="h-20"
            />
          </Link>
        </div>

        {/* Right side: nav links + auth (desktop) */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Links */}
          <div className="flex space-x-6">
            <Link to="/home" className={hoverColorClass}>Home</Link>
            {loggedIn && (
              <>
                <Link to="/picks" className={hoverColorClass}>Weekly Picks</Link>
                <Link to="/leaderboard" className={hoverColorClass}>Leaderboard</Link>
                <Link to="/survivor" className={hoverColorClass}>Survivor</Link>
                <Link to="/wednesday-reports" className={hoverColorClass}>Wed Reports</Link>
                <Link to="/payments" className={hoverColorClass}>Payments</Link>
              </>
            )}
          </div>

          {/* Auth buttons */}
          {loggedIn ? (
            <button
              onClick={onLogout}
              className="px-4 py-2 text-red-400 font-semibold hover:text-red-600"
            >
              Log Out
            </button>
          ) : (
            <>
              <Link to="/login" className={hoverColorClass}>Login</Link>
              <Link to="/signup" className={hoverColorClass}>Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-800 px-4 pb-4 space-y-2">
          <Link to="/home" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Home</Link>
          {loggedIn && (
            <>
              <Link to="/picks" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Weekly Picks</Link>
              <Link to="/leaderboard" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
              <Link to="/survivor" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Survivor</Link>
              <Link to="/wednesday-reports" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Wed Reports</Link>
              <Link to="/payments" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Payments</Link>
            </>
          )}

          {loggedIn ? (
            <button
              onClick={() => { onLogout(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-red-400 font-semibold hover:text-red-600"
            >
              Log Out
            </button>
          ) : (
            <>
              <Link to="/login" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="block hover:text-[#b1945a]" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
