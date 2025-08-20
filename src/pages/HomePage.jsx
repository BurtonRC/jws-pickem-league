import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [report, setReport] = useState(null);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState(null);

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

        // Replace any <img> tags in the report content with the correct logo path
        const processedContent = data.content.replace(
          /<img[^>]*>/g,
          `<img src="${logoPath}" alt="JW Pickem Logo" class="mx-auto my-4 w-32" />`
        );

        setReport({ ...data, content: processedContent });
      }
    };

    const fetchScores = async () => {
      try {
        const resp = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
        );
        if (!resp.ok) throw new Error("Score API error");
        const json = await resp.json();
        setScores(json.events || []);
      } catch {
        setError("Unable to load scores. Try again later.");
      }
    };

    fetchReport();
    fetchScores();
    const interval = setInterval(fetchScores, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Scoreboard */}
      <div className="bg-black text-white overflow-x-auto whitespace-nowrap flex items-center space-x-6 p-2">
        {scores.map((game) => {
          const comp = game.competitions?.[0]?.competitors;
          if (!comp) return null;
          const home = comp.find((t) => t.homeAway === "home");
          const away = comp.find((t) => t.homeAway === "away");
          return (
            <div key={game.id} className="flex items-center space-x-2">
              <span className="font-bold">{away?.team?.abbreviation}</span>
              <span>{away?.score}</span>
              <span className="text-gray-400">at</span>
              <span className="font-bold">{home?.team?.abbreviation}</span>
              <span>{home?.score}</span>
              <span className="text-sm text-gray-300">
                {game.status?.type?.shortDetail}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="w-full md:w-[90%] max-w-5xl mx-auto p-6 space-y-8">
        {report && (
          <section className="p-6 bg-white rounded-2xl shadow">
            <h2 className="text-2xl font-bold mb-2">{report.title}</h2>
            <p className="text-sm text-gray-500 mb-4">{report.report_date}</p>
            <div dangerouslySetInnerHTML={{ __html: report.content }} />
            <Link to="/wednesday-reports" className="text-blue-600 hover:underline mt-4 block">
              View Archive →
            </Link>

          </section>
        )}
        {error && <p className="text-red-500">{error}</p>}
      </main>
    </div>
  );
}
