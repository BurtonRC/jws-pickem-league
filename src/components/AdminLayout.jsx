import React from "react";
import { NavLink, Link } from "react-router-dom";

export default function AdminLayout({ children }) {
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

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 text-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Administration
              </h1>

              <p className="text-gray-300 text-sm mt-1">
                JW Pick'em League
              </p>
            </div>

            <Link
              to="/home"
              className="text-sm text-[#2dcbff] hover:text-white transition-colors"
            >
              ← Back to League
            </Link>
          </div>

          <nav className="mt-4">
            <div className="flex flex-wrap gap-2">
              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded transition-colors ${
                      isActive
                        ? "bg-[#034f68] text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <main className="w-full">
        {children}
      </main>
    </div>
  );
}