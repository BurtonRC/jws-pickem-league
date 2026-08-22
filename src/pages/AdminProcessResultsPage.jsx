import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "@/components/PageHeader";

const DEFAULT_SEASON = 2026;

export default function AdminProcessResultsPage() {
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [week, setWeek] = useState(1);

  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [runId, setRunId] = useState(null);
  const [runUrl, setRunUrl] = useState("");

  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const callProcessFunction = async (body) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error(
        "Your login session has expired. Please log in again."
      );
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-week`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Process Results returned HTTP ${response.status}.`
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Unable to process results."
      );
    }

    return result;
  };

  const checkRunStatus = async (id) => {
    try {
      const result = await callProcessFunction({
        action: "status",
        run_id: id,
      });

      setRunUrl(result.run_url || "");

      if (result.status === "completed") {
        stopPolling();

        if (result.conclusion === "success") {
          setStatus("success");
          setLoading(false);
          setMessage(
            `Season ${season}, Week ${week} results processed successfully.`
          );
        } else {
          setStatus("error");
          setLoading(false);
          setError(
            `Results processing failed${
              result.conclusion
                ? `: ${result.conclusion}`
                : "."
            }`
          );
        }
      }
    } catch (err) {
      stopPolling();
      setStatus("error");
      setLoading(false);
      setError(
        err.message ||
          "Unable to check results processing status."
      );
    }
  };

  const handleProcessResults = async () => {
    stopPolling();

    setLoading(true);
    setStatus("starting");
    setMessage("");
    setError("");
    setRunId(null);
    setRunUrl("");

    try {
      const result = await callProcessFunction({
        action: "start",
        season: Number(season),
        week: Number(week),
      });

      setRunId(result.run_id);
      setRunUrl(result.run_url || "");
      setStatus("processing");

      setMessage(
        `Season ${season}, Week ${week} processing started.`
      );

      // Check once immediately.
      await checkRunStatus(result.run_id);

      // Continue checking every 3 seconds until GitHub finishes.
      if (pollRef.current === null) {
        pollRef.current = setInterval(() => {
          checkRunStatus(result.run_id);
        }, 3000);
      }
    } catch (err) {
      setStatus("error");
      setLoading(false);
      setError(
        err.message ||
          "Unable to start results processing."
      );
    }
  };

  const processing =
    status === "starting" ||
    status === "processing";

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div>
        <PageHeader>
          Admin — Process Results
        </PageHeader>
          
        <p className="text-gray-600 mt-1">
          Process completed NFL games and generate
          league results for the selected season and week.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4">

        <div className="flex items-center gap-6">

          <div className="flex items-center gap-3">
            <label className="font-semibold">
              Season:
            </label>

            <select
              value={season}
              onChange={(e) =>
                setSeason(
                  Number(e.target.value)
                )
              }
              disabled={loading}
              className="border rounded px-3 py-2"
            >
              <option value={2026}>
                2026
              </option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="font-semibold">
              Week:
            </label>

            <select
              value={week}
              onChange={(e) =>
                setWeek(
                  Number(e.target.value)
                )
              }
              disabled={loading}
              className="border rounded px-3 py-2"
            >
              {Array.from(
                { length: 18 },
                (_, i) => i + 1
              ).map((number) => (
                <option
                  key={number}
                  value={number}
                >
                  Week {number}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4">
          <strong>Error:</strong>{" "}
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">

        <div className="font-semibold">
          {season} — Week {week}
        </div>

        <div className="text-gray-600 mt-1">
          Process completed NFL games and update
          the league results.
        </div>

        {processing && (
          <div className="bg-blue-50 border border-blue-300 text-blue-700 rounded-lg p-4 mt-6">
            {status === "starting"
              ? "Starting results processing..."
              : "Results are being processed. Please wait..."}
          </div>
        )}

        {runId && (
          <div className="text-sm text-gray-500 mt-4">
            GitHub Actions Run:{" "}
            {runUrl ? (
              <a
                href={runUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Run
              </a>
            ) : (
              runId
            )}
          </div>
        )}

      </div>

      <div className="flex justify-end">

        <button
          type="button"
          onClick={handleProcessResults}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {status === "starting"
            ? "Starting..."
            : status === "processing"
            ? "Processing..."
            : "Process Results"}
        </button>

      </div>

    </div>
  );
}