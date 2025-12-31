import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar({ loggedIn, onLogout, minimal = false, user, setMenuOpen, menuOpen }) {
  // Convert username to initials
  const initials = user?.username
    ?.split(" ")
    .map(name => name[0].toUpperCase())
    .join("");

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

  // Submenu state
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Links array for DRY rendering
  const links = [
    { to: "/home", label: "Home", authRequired: false },
    { to: "/picks", label: "Weekly Picks", authRequired: true },
    // Boards is the parent, not a link itself
    { to: null, label: "Boards", authRequired: true, submenu: [
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/survivor", label: "Survivor" },
      //{ to: "/picks-board", label: "User's Picks" }
    ]},
    { to: "/wednesday-reports", label: "Wed Reports", authRequired: true },
    { to: "/payments", label: "Payments", authRequired: true },
    { to: "/comments", label: "Comments", authRequired: true },
    { to: "/login", label: "Login", authRequired: false, hideIfLoggedIn: true },
    { to: "/signup", label: "Sign Up", authRequired: false, hideIfLoggedIn: true },
  ];

  return (
    <nav className="relative w-full bg-gray-900 text-white shadow z-50">
      <div
        className="w-full max-w-[1230px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: "50px" }}
      >
        {/* Left: logo + nav links */}
        <div className="flex items-center flex-1 min-w-0">
          <Link to="/home" aria-label="Home" className="flex-shrink-0">
            <img
              src={logoPath}
              alt="JWs PickEm League Logo"
              className="h-10 sm:h-12 md:h-[4.4rem] w-auto"
              style={{ paddingLeft: 0 }}
            />
          </Link>

          {/* Desktop nav links — hidden if minimal */}
          {!minimal && (
            <div className="hidden md:flex items-center ml-6 flex-shrink overflow-hidden nav-link-small relative">
              {links.map((link, index) => {
                if (link.authRequired && !loggedIn) return null;
                if (link.hideIfLoggedIn && loggedIn) return null;

                // If the link has a submenu
if (link.submenu) {
  return (
    <div
      key={index}
      className="relative"
      onMouseEnter={() => setSubmenuOpen(true)} // desktop hover
      onMouseLeave={() => setSubmenuOpen(false)}
    >
      {/* Boards Menu Text */}
      <span
        className="flex items-center h-full px-3 bg-[#034f68] text-white select-none cursor-pointer"
        style={{ height: "50px" }} // match the parent nav height
        onClick={() => setSubmenuOpen((prev) => !prev)} // toggle for iPad/touch
      >
        {link.label}
      </span>

      {/* Submenu panel */}
      {submenuOpen && (
        <div className="absolute top-full left-0 mt-0 bg-gray-700 shadow-lg w-max z-50">
          {link.submenu.map((sublink, subIndex) => (
            <NavLink
              key={subIndex}
              to={sublink.to}
              onClick={() => setSubmenuOpen(false)} // closes submenu after tap
              className={({ isActive }) =>
                `block px-4 py-2 w-full transition-colors ${
                  isActive ? "bg-gray-600" : "hover:bg-gray-500"
                }`
              }
            >
              {sublink.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}


                // Normal link
                return (
                  <NavLink
                    key={index}
                    to={link.to}
                    className={({ isActive }) =>
                      `${linkBase} ${hoverColorClass} ${isActive ? linkActive : ""}`
                    }
                    style={{ paddingTop: "17px", paddingBottom: "17px" }}
                  >
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side logout — hidden if minimal */}
        {!minimal && loggedIn && (
          <div className="relative ml-auto hidden md:block">
            {/* Avatar circle with initials */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white font-semibold text-sm focus:outline-none"
              title={user?.username} // tooltip shows full name
            >
              {user?.username
                ?.split(" ")
                .map((n) => n[0].toUpperCase())
                .join("")}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="absolute right-0 top-full w-32 bg-gray-800 border border-gray-700 rounded shadow-lg z-50
                      transform transition-all duration-200 ease-out opacity-0 scale-95 animate-dropdown translate-y-5" // small nudge down, change 1 to 0, 2, etc."
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
                  onMouseEnter={(e) => (e.target.style.color = "#daf6ffff")}
                  onMouseLeave={(e) => (e.target.style.color = "#2dcbff")}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile avatar — replaces hamburger */}
        {!minimal && loggedIn && (
          <button
            className="md:hidden focus:outline-none ml-auto"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle Menu"
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white font-semibold text-sm"
              title={user?.username}
            >
              {user?.username
                ?.split(" ")
                .map((n) => n[0].toUpperCase())
                .join("")}
            </div>
          </button>
        )}
      </div>

      {/* Mobile dropdown — hidden if minimal */}
      {!minimal && menuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="max-w-[70%] mx-auto px-4 py-2 space-y-2">
            {links.map((link) => {
              if (link.authRequired && !loggedIn) return null;
              if (link.hideIfLoggedIn && loggedIn) return null;

              if (link.submenu) {
                return (
                  <div key={link.label} className="space-y-0">
                    <span className="block px-2 py-2 bg-[#034f68]">{link.label}</span>
                    {link.submenu.map((sublink) => (
                      <NavLink
                        key={sublink.to}
                        to={sublink.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `block px-4 py-2 w-full transition-colors ${
                            isActive ? "bg-gray-600" : "hover:bg-gray-500"
                          }`
                        }
                      >
                        {sublink.label}
                      </NavLink>
                    ))}
                  </div>
                );
              }

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 ${hoverColorClass} ${isActive ? "text-[#f1f2f3]" : ""}`
                  }
                >
                  {link.label}
                </NavLink>
              );
            })}

            {/* Mobile logout */}
            {loggedIn && (
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
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
