import express from "express";
import cors from "cors";
import { Pool } from "pg"; // or your DB client

const app = express();
const PORT = 3001;

app.use(cors());

// --- Configure your database ---
const pool = new Pool({
  user: "your_db_user",
  host: "localhost",
  database: "your_db_name",
  password: "your_db_pass",
  port: 5432, // adjust if needed
});

// --- Team records endpoint ---
app.get("/team-records", async (req, res) => {
  try {
    // Replace with your actual table/columns
    const query = `
      SELECT team, 
             SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
             SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses
      FROM game_results
      GROUP BY team
    `;
    const { rows } = await pool.query(query);

    const records = {};
    rows.forEach(row => {
      records[row.team.toLowerCase()] = `${row.wins}-${row.losses}`;
    });

    res.json(records);
  } catch (err) {
    console.error("Error fetching team records:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
