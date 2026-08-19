import React from "react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Administration
        </h1>

        <p className="text-gray-600 mt-1">
          Manage the weekly JW Pick'em League operations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          to="/admin/wednesday-report"
          className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Wednesday Report
          </h2>

          <p className="text-gray-600">
            Enter and publish the weekly Wednesday Report.
          </p>
        </Link>

        <Link
          to="/admin/week-setup"
          className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Week Setup
          </h2>

          <p className="text-gray-600">
            Configure the week's games, Drive-By and Point Spread.
          </p>
        </Link>

        <Link
          to="/admin/process-results"
          className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            Process Results
          </h2>

          <p className="text-gray-600">
            Process completed NFL games and generate league results.
          </p>
        </Link>
      </div>

      <div className="flex justify-start">
        <Link
          to="/home"
          className="text-blue-600 hover:underline"
        >
          ← Back to League
        </Link>
      </div>
    </div>
  );
}