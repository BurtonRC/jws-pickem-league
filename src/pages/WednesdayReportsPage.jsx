import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pliswiceskoebzcxbgwt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsaXN3aWNlc2tvZWJ6Y3hiZ3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTkwNTIsImV4cCI6MjA3MDQ5NTA1Mn0.2Bl-0aRiSP5zdsuqCE6z5ER_KjUcOhFPJQY_t-XGawc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WednesdayReportsPage() {
  const [reports, setReports] = useState([]);
  const [reportToShow, setReportToShow] = useState(null);
  const [year, setYear] = useState('');
  const [week, setWeek] = useState('');

  // Base path for images works in dev and prod
  const logoPath = import.meta.env.BASE_URL + 'images/pickem-logo.png';

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('wednesday_reports')
        .select('*')
        .order('report_date', { ascending: true });

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      setReports(data || []);
    };

    fetchReports();
  }, []);

  useEffect(() => {
    if (reports.length === 0 || (!year && !week)) {
      setReportToShow(null);
      return;
    }

    const reportMap = {};
    reports.forEach((r) => {
      const y = new Date(r.report_date).getFullYear();
      const key = `${y}-week${r.week}`;
      if (!reportMap[key]) reportMap[key] = r;
    });

    let keyToShow;
    if (year && week) {
      keyToShow = `${year}-week${week}`;
    } else {
      const latest = reports.reduce((a, b) =>
        new Date(a.report_date) > new Date(b.report_date) ? a : b
      );
      const y = new Date(latest.report_date).getFullYear();
      keyToShow = `${y}-week${latest.week}`;
    }

    const selectedReport = reportMap[keyToShow];

    if (selectedReport) {
      const processedContent = selectedReport.content
        // remove all <link> tags that include ".css" anywhere in them
        .replace(/<link\b[^>]*\.css[^>]*>/gi, "")
        // replace all <img> tags with your logo
        .replace(/<img\b[^>]*>/gi, `<img src="/images/pickem-logo.png" alt="JW Pickem Logo" class="mx-auto my-4 w-32" />`);



      setReportToShow({ ...selectedReport, processedContent });
    } else {
      setReportToShow(null);
    }
  }, [year, week, reports]);


  const years = [...new Set(reports.map((r) => new Date(r.report_date).getFullYear()))].sort();
  const weeks = [...new Set(reports.map((r) => r.week))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Wednesday Reports</h1>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="p-2 border rounded bg-white"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="p-2 border rounded bg-white"
        >
          <option value="">All Weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      {/* Welcome Page */}
      {!year && !week && (
        <div className="text-center max-w-2xl">
          <img src={logoPath} alt="JW Pickem Logo" className="mx-auto w-32 mb-6" />
          <h2 className="text-xl font-semibold mb-2">Welcome to the Wednesday Report</h2>
          <p className="mb-2">A biased, highly opinionated compendium of thoughts and insights on the NFL.</p>
          <p>Select the year and week from the drop downs to read from the JW's Pick'em archives.</p>
        </div>
      )}

      {/* Report */}
      {reportToShow && (
        <div className="w-full max-w-4xl bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {reportToShow.title} (Week {reportToShow.week})
          </h2>
          <div
            className="prose max-w-full"
            dangerouslySetInnerHTML={{ __html: reportToShow.processedContent }}
          />
        </div>
      )}

      {year && week && !reportToShow && <p>No report found for the selected week/year.</p>}
    </div>
  );
}
