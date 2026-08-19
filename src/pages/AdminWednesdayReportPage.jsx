import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const DEFAULT_SEASON = 2026;

export default function AdminWednesdayReportPage() {
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [week, setWeek] = useState(1);
  const [reportDate, setReportDate] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("wednesday_reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (err) {
      console.error("Load Wednesday Reports error:", err);
      setError(
        err.message || "Unable to load Wednesday Reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const loadReportForWeek = (selectedSeason, selectedWeek) => {
    const existing = reports.find((report) => {
      const reportYear = new Date(
        `${report.report_date}T00:00:00`
      ).getFullYear();

      return (
        reportYear === Number(selectedSeason) &&
        Number(report.week) === Number(selectedWeek)
      );
    });

    if (existing) {
      setReportDate(existing.report_date || "");
      setTitle(existing.title || "");
      setContent(existing.content || "");
    } else {
      setReportDate("");
      setTitle(
        `Wednesday Report Week ${selectedWeek}`
      );
      setContent("");
    }

    setMessage("");
    setError("");
  };

  useEffect(() => {
    if (reports.length > 0) {
      loadReportForWeek(season, week);
    } else {
      setReportDate("");
      setTitle(`Wednesday Report Week ${week}`);
      setContent("");
    }
  }, [season, week, reports]);

  const handleSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!reportDate) {
      setError("Please enter the report date.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a report title.");
      return;
    }

    if (!content.trim()) {
      setError("Please enter the report HTML content.");
      return;
    }

    const reportYear = new Date(
      `${reportDate}T00:00:00`
    ).getFullYear();

    if (reportYear !== Number(season)) {
      setError(
        `The report date must be in the selected ${season} season.`
      );
      return;
    }

    setSaving(true);

    try {
      const existing = reports.find((report) => {
        const existingYear = new Date(
          `${report.report_date}T00:00:00`
        ).getFullYear();

        return (
          existingYear === Number(season) &&
          Number(report.week) === Number(week)
        );
      });

      const row = {
        report_date: reportDate,
        title: title.trim(),
        content,
        week: Number(week),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from("wednesday_reports")
          .update(row)
          .eq("id", existing.id);

        if (updateError) throw updateError;

        setMessage(
          `2026 Week ${week} Wednesday Report updated successfully.`
        );
      } else {
        const { error: insertError } = await supabase
          .from("wednesday_reports")
          .insert(row);

        if (insertError) throw insertError;

        setMessage(
          `2026 Week ${week} Wednesday Report saved successfully.`
        );
      }

      await loadReports();
    } catch (err) {
      console.error(
        "Save Wednesday Report error:",
        err
      );

      setError(
        err.message ||
          "Unable to save Wednesday Report."
      );
    } finally {
      setSaving(false);
    }
  };

  const previewContent = content
    .replace(
      /<link\b[^>]*\.css[^>]*>/gi,
      ""
    )
    .replace(
      /<img\b[^>]*>/gi,
      `<img src="/images/pickem-logo.png" alt="JW Pickem Logo" class="mx-auto my-4 w-32" />`
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Wednesday Report
        </h1>

        <p className="text-gray-600 mt-1">
          Enter and publish the weekly Wednesday Report.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6"
      >
        <div className="bg-white border rounded-lg p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block font-semibold mb-1">
                Season
              </label>

              <select
                value={season}
                onChange={(e) =>
                  setSeason(Number(e.target.value))
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Week
              </label>

              <select
                value={week}
                onChange={(e) =>
                  setWeek(Number(e.target.value))
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from(
                  { length: 18 },
                  (_, index) => index + 1
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

            <div>
              <label className="block font-semibold mb-1">
                Report Date
              </label>

              <input
                type="date"
                value={reportDate}
                onChange={(e) =>
                  setReportDate(e.target.value)
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <label className="block font-semibold mb-2">
            HTML Content
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            disabled={saving}
            rows={20}
            spellCheck={false}
            className="w-full border rounded px-3 py-2 font-mono text-sm resize-y"
            placeholder="<div>...</div>"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Wednesday Report"}
          </button>
        </div>
      </form>

      {content && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-100 border-b px-4 py-3">
            <h2 className="font-semibold">
              Preview
            </h2>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {title} (Week {week})
            </h2>

            <div
              className="prose max-w-full"
              dangerouslySetInnerHTML={{
                __html: previewContent,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}