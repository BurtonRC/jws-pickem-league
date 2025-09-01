import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase client with service role key for inserts
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const week = 1;

async function loadDummySurvivorPicks() {
  try {
    const dummySurvivorPicks = [
      { user_id: "a1111111-1111-1111-1111-111111111111", week, team: "Miami Dolphins", result: "pending" },
      { user_id: "b2222222-2222-2222-2222-222222222222", week, team: "Baltimore Ravens", result: "pending" },
      { user_id: "c3333333-3333-3333-3333-333333333333", week, team: "Green Bay Packers", result: "pending" },
      { user_id: "d7ed43f2-00d7-4d19-9aaa-d7c3f13ef26f", week, team: "Cleveland Browns", result: "pending" }
    ];

    // ✅ Upsert picks into survivor_picks table
    for (const pick of dummySurvivorPicks) {
      const { error } = await supabase
        .from("survivor_picks")
        .upsert(pick, { onConflict: ["user_id", "week"] });

      if (error) console.error("Error inserting survivor pick:", error);
    }

    console.log("🎉 Dummy survivor picks loaded successfully!");
  } catch (err) {
    console.error("❌ Failed to load dummy survivor picks:", err);
  }
}

loadDummySurvivorPicks();
