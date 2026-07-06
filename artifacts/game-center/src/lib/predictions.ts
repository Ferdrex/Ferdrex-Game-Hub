// World Cup 2026 prediction submissions -> Supabase (insert-only table).
// The anon key is public by design; RLS allows insert but not read, so
// submitted names stay private (visible only in the Supabase dashboard).

const SUPABASE_URL = "https://avnuratwohwzltxiocox.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bnVyYXR3b2h3emx0eGlvY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyODQzNDgsImV4cCI6MjA5ODg2MDM0OH0.GUSCj-BWCO1aM6v6HL-mKOO3VCSpNzfb_g0_tTc36Bo";

const REST = `${SUPABASE_URL}/rest/v1/predictions`;

export type Prediction = {
  name: string;
  champion: string;
  runner_up: string;
  top_scorer: string;
};

/** Insert a prediction. Returns true on success. Never throws. */
export async function submitPrediction(p: Prediction): Promise<boolean> {
  try {
    const res = await fetch(REST, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: p.name.trim().slice(0, 24),
        champion: p.champion.slice(0, 40),
        runner_up: p.runner_up.slice(0, 40),
        top_scorer: p.top_scorer.trim().slice(0, 40),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
