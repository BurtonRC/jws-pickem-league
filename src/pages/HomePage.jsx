import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { useComments } from "../context/CommentsContext";

export default function HomePage({ user }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const { comments } = useComments();

  // Safe timestamp parser
  const parseTimestamp = (ts) => new Date(ts.includes("T") ? ts : ts + "Z");

  // Fetch latest report
  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase
        .from("wednesday_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(1)
        .single();

      if (error) setError("Failed to load Wednesday Report");
      else {
        const logoPath = `${import.meta.env.BASE_URL}images/pickem-logo.png`;
        const processedContent = data.content.replace(
          /<img[^>]*>/g,
          `<img src="${logoPath}" alt="JW Pickem Logo" class="mx-auto my-4 w-32 sm:w-40 md:w-48 lg:w-56" />`
        );
        setReport({ ...data, content: processedContent });
      }
    };

    fetchReport();
  }, []);

  const previewComments = comments.slice(0, 3);

  return (
    <main className="w-full max-w-[100%] lg:max-w-[1024px] mx-auto px-[12px] lg:px-[40px] space-y-8">
      {report && (
        <section className="p-[15px] lg:p-[30px] bg-white rounded-2xl shadow w-full">
          <h2 className="text-2xl font-bold mb-2">{report.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{report.report_date}</p>
          <div dangerouslySetInnerHTML={{ __html: report.content }} />
          <Link
            to="/wednesday-reports"
            className="text-blue-600 hover:underline mt-4 block"
          >
            View Archive →
          </Link>
        </section>
      )}
      {error && <p className="text-red-500">{error}</p>}

      {/* Comments preview */}
      {previewComments.length > 0 && (
        <section className="p-[15px] lg:p-[30px] bg-gray-100 rounded-xl space-y-4 w-full">
          <h3 className="text-xl font-semibold">Recent Comments</h3>
          {previewComments.map((c) => (
            <div key={c.id} className="border-b border-gray-300 pb-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{c.username ?? "Unknown"}:</span>{" "}
                {c.content}
              </p>
              <p className="text-xs text-gray-400">
                {parseTimestamp(c.created_at).toLocaleString([], {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
          ))}
          <Link
            to="/comments"
            className="text-blue-600 hover:underline mt-2 block"
          >
            View All Comments →
          </Link>
        </section>
      )}
    </main>
  );
}
