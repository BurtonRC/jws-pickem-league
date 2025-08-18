import fs from 'fs';
import path from 'path';

// Folder with your HTML reports
const inputDir = "./src/reports";

// Output SQL file
const outputFile = "./insert_wednesday_reports.sql";

// Check if folder exists
if (!fs.existsSync(inputDir)) {
  console.error(`Folder not found: ${inputDir}`);
  process.exit(1);
}

// Collect all files in the folder
const files = fs.readdirSync(inputDir).filter(file => file.endsWith(".html"));

// Start SQL content
let sqlContent = "-- Wednesday Reports Insert Statements\n\n";

files.forEach(file => {
  const filePath = path.join(inputDir, file);
  let content = fs.readFileSync(filePath, "utf-8");

  // Replace any <img> tag with your logo and fix alt text
  content = content.replace(
    /<img[^>]*src="[^"]*"[^>]*>/g,
    `<img src="/images/pickem_logo.png" alt="JW Pickem Logo" />`
  );

  // Remove apostrophe from Pick'em in the content
  content = content.replace(/Pick'em/g, 'Pickem');

  // Escape single quotes for SQL
  content = content.replace(/'/g, "''");

  // Remove line breaks
  content = content.replace(/\r?\n/g, " ");

  // Extract year and week from filename (e.g., 2023_week1.html)
  const match = file.match(/(\d{4})_week(\d{1,2})\.html/);
  if (!match) return;
  const [_, year, week] = match;

  // Example report_date: Wednesday of that week (placeholder)
  const report_date = `${year}-01-01`; // You can replace with exact Wednesday if desired

  // Title
  const title = `Wednesday Report Week ${week}`;

  // Append INSERT statement
  sqlContent += `INSERT INTO wednesday_reports (report_date, week, title, content) VALUES ('${report_date}', ${week}, '${title}', '${content}');\n\n`;
});

// Write to output file
fs.writeFileSync(outputFile, sqlContent, "utf-8");
console.log(`SQL file generated: ${outputFile}`);
