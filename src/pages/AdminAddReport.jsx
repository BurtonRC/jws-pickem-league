import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AdminAddReport() {
  const [title, setTitle] = useState("");
  const [week, setWeek] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !week || !reportDate || !content) {
      setMessage("Please fill out all fields.");
      return;
    }

    const { error } = await supabase.from("wednesday_reports").insert([
      {
        title,
        week: parseInt(week),
        report_date: reportDate,
        content, // could be markdown or HTML
      },
    ]);

    if (error) {
      setMessage("Error saving report: " + error.message);
    } else {
      setMessage("Report added successfully!");
      setTitle("");
      setWeek("");
      setReportDate("");
      setContent("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Add Wednesday Report</h1>

      {message && <p className="mb-4 text-blue-600">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Week</label>
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Report Date</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Content</label>
          <textarea
            rows="10"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border p-2 rounded"
          ></textarea>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Report
        </button>
      </form>
    </div>
  );
}
