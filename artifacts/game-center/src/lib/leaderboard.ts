// Global leaderboards backed by Supabase (PostgREST) via plain fetch — no SDK.
// The anon key is public by design and only allows read + insert on the
// `scores` table thanks to the Row Level Security policies configured in Supabase.

const SUPABASE_URL = "https://avnuratwohwzltxiocox.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bnVyYXR3b2h3emx0eGlvY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyODQzNDgsImV4cCI6MjA5ODg2MDM0OH0.GUSCj-BWCO1aM6v6HL-mKOO3VCSpNzfb_g0_tTc36Bo";

const REST = `${SUPABASE_URL}/rest/v1/scores`;
const authHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export type ScoreRow = { name: string; score: number; created_at?: string };

/** Top scores for a game, highest first. Returns [] on any failure so the UI never crashes. */
export async function getTopScores(game: string, limit = 10): Promise<ScoreRow[]> {
  try {
    const url = `${REST}?game=eq.${encodeURIComponent(game)}&select=name,score,created_at&order=score.desc&limit=${limit}`;
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) return [];
    return (await res.json()) as ScoreRow[];
  } catch {
    return [];
  }
}

/** Submit a score. Name is trimmed/clamped to 12 chars. Returns true on success. */
export async function submitScore(game: string, name: string, score: number): Promise<boolean> {
  try {
    const clean = name.trim().slice(0, 12) || "ANON";
    const res = await fetch(REST, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ game, name: clean, score: Math.max(0, Math.floor(score)) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
