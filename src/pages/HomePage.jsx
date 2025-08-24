import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // Fetch report
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
          `<img src="${logoPath}" alt="JW Pickem Logo" class="mx-auto my-4 w-32" />`
        );
        setReport({ ...data, content: processedContent });
      }
    };

    fetchReport();
  }, []);

  return (
    <main className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-8">
      {report && (
        <section className="p-6 bg-white rounded-2xl shadow">
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
    </main>
  );
}
