import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // must have service role for upserts
);

const week = 1;

async function loadFakeWeek1Data() {
  try {
    // 1️⃣ Fake users picks (mirror normal user flow)
    const weeklyPicks = [
      {
        user_id: "d7ed43f2-00d7-4d19-9aaa-d7c3f13ef26f",
        week,
        picks: {
          "401772510": "Dallas Cowboys",
          "401772714": "Kansas City Chiefs",
          "401772718": "Arizona Cardinals",
          "401772719": "Miami Dolphins",
          "401772720": "Las Vegas Raiders",
          "401772721": "New York Jets",
          "401772722": "Detroit Lions",
          "401772723": "Houston Texans",
          "401772810": "Minnesota Vikings",
          "401772827": "Washington Commanders",
          "401772828": "Carolina Panthers",
          "401772829": "Cincinnati Bengals",
          "401772830": "Tampa Bay Buccaneers",
          "401772831": "San Francisco 49ers",
          "401772832": "Tennessee Titans",
          "401772918": "Baltimore Ravens"
        },
        point_spreads: {
          "401772510": "Dallas Cowboys +3.5",
          "401772714": "Kansas City Chiefs -7",
          "401772830": "Atlanta Falcons -6"
        },
        survivor_pick: "Cleveland Browns", // ✅ winner
        dbs: {
          "401772510": "Dallas Cowboys",
          "401772714": "Kansas City Chiefs",
          "401772830": "Tampa Bay Buccaneers"
        }
      },
      {
        user_id: "a1111111-1111-1111-1111-111111111111",
        week,
        picks: { "401772510": "Dallas Cowboys", "401772714": "Kansas City Chiefs" },
        point_spreads: { "401772510": "Dallas Cowboys +3.5" },
        survivor_pick: "Miami Dolphins", // ✅ winner
        dbs: { "401772510": "Dallas Cowboys" }
      },
      {
        user_id: "b2222222-2222-2222-2222-222222222222",
        week,
        picks: { "401772510": "Dallas Cowboys", "401772714": "Kansas City Chiefs" },
        point_spreads: { "401772510": "Dallas Cowboys +3.5" },
        survivor_pick: "Baltimore Ravens", // ✅ winner
        dbs: { "401772510": "Dallas Cowboys" }
      },
      {
        user_id: "c3333333-3333-3333-3333-333333333333",
        week,
        picks: { "401772510": "Dallas Cowboys", "401772714": "Kansas City Chiefs" },
        point_spreads: { "401772510": "Dallas Cowboys +3.5" },
        survivor_pick: "Green Bay Packers", // ❌ loser
        dbs: { "401772510": "Dallas Cowboys" }
      }
    ];

    // 2️⃣ Insert weekly picks (exactly like real users do)
    for (const pick of weeklyPicks) {
      const { error } = await supabase.from("weekly_picks").upsert(pick, {
        onConflict: ["user_id", "week"]
      });
      if (error) console.error("❌ Error inserting weekly pick:", error);
    }

    // 3️⃣ Run compute_weekly_results RPC
    const { error: computeError } = await supabase.rpc("compute_weekly_results", {
      target_week: week
    });
    if (computeError) {
      console.error("❌ Error computing weekly results:", computeError);
      return;
    }
    console.log("✅ Weekly results computed (includes survivor picks)");

    // 4️⃣ Safety check: fetch weekly_results for this week
    const { data: results, error: resultsError } = await supabase
      .from("weekly_results")
      .select("user_id, week, total_points, survivor_pick, survivor_result")
      .eq("week", week);

    if (resultsError) {
      console.error("❌ Error fetching weekly_results check:", resultsError);
    } else {
      console.log("📊 Weekly Results snapshot:", results);
    }

    console.log("🎉 Fake Week 1 data loaded and processed for 4 users!");
  } catch (err) {
    console.error("❌ Failed to load fake week 1 data:", err);
  }
}

loadFakeWeek1Data();
