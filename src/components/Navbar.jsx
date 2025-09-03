import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar({ loggedIn, onLogout, minimal = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Hover color
  const hoverColorClass = "hover:text-[#f1f2f3]";

  // Base link styles
  const linkBase = "relative flex items-center px-2 py-2 transition-colors";

  // Active link arrow doubled (12px)
  const linkActive =
    "text-[#f1f2f3] after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 " +
    "after:bottom-0 after:border-l-[9px] after:border-r-[9px] after:border-b-[9px] " +
    "after:border-l-transparent after:border-r-transparent after:border-b-white";

  const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;

  return (
    <nav className="w-full bg-gray-900 text-white shadow z-50">
      <div
          className="w-full max-w-[1230px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{ height: "50px" }}
        >

        {/* Left: logo + nav links */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Logo flush left */}
          <Link to="/home" aria-label="Home" className="flex-shrink-0">
            <img
              src={logoPath}
              alt="JWs PickEm League Logo"
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop nav links — hidden if minimal */}
          {!minimal && (
            <div className="hidden md:flex items-center gap-[12px] ml-6 flex-shrink overflow-hidden">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `${linkBase} ${hoverColorClass} ${
                    isActive ? linkActive : ""
                  }`
                }
                style={{ paddingTop: "17px", paddingBottom: "17px" }}
              >
                Home
              </NavLink>

              {loggedIn && (
                <>
                  <NavLink
                    to="/picks"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Weekly Picks
                  </NavLink>
                  <NavLink
                    to="/leaderboard"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Leaderboard
                  </NavLink>
                  <NavLink
                    to="/survivor"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Survivor
                  </NavLink>
                  <NavLink
                    to="/wednesday-reports"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Wed Reports
                  </NavLink>
                  <NavLink
                    to="/payments"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Payments
                  </NavLink>
                </>
              )}

              {!loggedIn && (
                <>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${
                        isActive ? linkActive : ""
                      }`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    Sign Up
                  </NavLink>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right side logout — hidden if minimal */}
        {!minimal && loggedIn && (
          <button
            onClick={onLogout}
            className="hidden md:block px-3 py-2 font-semibold text-red-400 hover:text-red-500 flex-shrink-0 ml-auto"
          >
            Log Out
          </button>
        )}

        {/* Mobile hamburger — hidden if minimal */}
        {!minimal && (
          <button
            className="md:hidden focus:outline-none ml-auto"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle Menu"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile dropdown — hidden if minimal */}
      {!minimal && menuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="max-w-[70%] mx-auto px-4 py-2 space-y-2">
            <NavLink
              to="/home"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block py-2 ${hoverColorClass} ${
                  isActive ? "text-[#f1f2f3]" : ""
                }`
              }
            >
              Home
            </NavLink>

            {loggedIn ? (
              <>
                <NavLink
                  to="/picks"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Weekly Picks
                </NavLink>
                <NavLink
                  to="/leaderboard"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Leaderboard
                </NavLink>
                <NavLink
                  to="/survivor"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Survivor
                </NavLink>
                <NavLink
                  to="/wednesday-reports"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Wed Reports
                </NavLink>
                <NavLink
                  to="/payments"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Payments
                </NavLink>
                <button
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-2 font-semibold text-red-400 hover:text-red-500"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${
                      isActive ? "text-[#f1f2f3]" : ""
                    }`
                  }
                >
                  Sign Up
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
