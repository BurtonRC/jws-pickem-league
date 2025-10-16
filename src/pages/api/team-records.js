// pages/api/team-records.js
const API_KEY = "442749d9c1202b93fc699b06fdfbd490"; // your API key
const API_URL = "https://api.sportsdata.io/v3/nfl/scores/json/Standings/2025";

// Map API-Sports team keys to ESPN abbreviations
const apiSportsToEspn = {
  NE: "ne",
  BUF: "buf",
  MIA: "mia",
  NYJ: "nyj",
  BAL: "bal",
  PIT: "pit",
  CLE: "cle",
  CIN: "cin",
  KC: "kc",
  LV: "lv",
  LAC: "lac",
  DEN: "den",
  TEN: "ten",
  IND: "ind",
  HOU: "hou",
  JAX: "jax",
  PHI: "phi",
  DAL: "dal",
  NYG: "nyg",
  WAS: "wsh",
  TB: "tb",
  NO: "no",
  CAR: "car",
  MIN: "min",
  GB: "gb",
  CHI: "chi",
  DET: "det",
  SEA: "sea",
  SF: "sf",
  LAR: "lar",
  ATL: "atl",
  ARI: "ari",
};

export default async function handler(req, res) {
  try {
    const resp = await fetch(`${API_URL}?key=${API_KEY}`);
    if (!resp.ok) {
      const text = await resp.text();
      console.error("API-Sports response error:", resp.status, text);
      return res.status(resp.status).json({ error: "API error" });
    }

    const data = await resp.json();

    // Map API-Sports keys to ESPN abbreviations
    const records = {};
    data.forEach((team) => {
      const espnAbbr = apiSportsToEspn[team.Key];
      if (espnAbbr) {
        records[espnAbbr] = `${team.Wins}-${team.Losses}`;
      }
    });

    res.status(200).json(records);
  } catch (err) {
    console.error("API route error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
