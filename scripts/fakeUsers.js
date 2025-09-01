import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

// Make sure these env vars exist
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role required
);

async function createFakeUsers() {
  const users = [
    { id: "a1111111-1111-1111-1111-111111111111", username: "UserA" },
    { id: "b2222222-2222-2222-2222-222222222222", username: "UserB" },
    { id: "c3333333-3333-3333-3333-333333333333", username: "UserC" }
  ];

  for (const user of users) {
    // Insert into auth.users
    const { error: authErr } = await supabase.auth.admin.createUser({
      id: user.id,
      email: `${user.username.toLowerCase()}@example.com`,
      password: "Sup3rS3cret!"
    });
    if (authErr && authErr.message !== "User already registered") {
      console.error("Error creating auth user:", authErr);
      continue;
    }

    // Insert into profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: user.username });
    if (profErr) console.error("Error creating profile:", profErr);
  }

  console.log("✅ Fake users created");
}

createFakeUsers().catch((err) => console.error(err));
