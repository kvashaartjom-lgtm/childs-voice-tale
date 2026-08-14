import { createClient } from "@supabase/supabase-js";

// Anon key is public by design — security is enforced by RLS policies on the server.
// Fallbacks ensure the client works in Lovable's preview where .env is not injected.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://ffgbslqxuvcvbaolxybq.supabase.co";

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2JzbHF4dXZjdmJhb2x4eWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTAzMzIsImV4cCI6MjEwMTY4NjMzMn0.787TvUZ3vnHCi0MQbU9g4IVtdsCEk-BQrYr7IMDiASw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Ensures every visitor has a real auth.uid() before any domain-model write
// (Phase 0 / Step 1's profiles/families/... tables all key off auth.uid()).
// No-op once a session already exists. Never throws — callers must keep
// working even if anonymous sign-in fails (network issue, feature not
// enabled, etc.); the existing mock/legacy prototype flow does not depend
// on this succeeding. Logs loudly at every branch on purpose: a silent
// failure here is indistinguishable from success, which is exactly how
// this shipped broken once already — see docs/31-CURRENT-STATE.md.
export async function ensureAnonymousSession(): Promise<void> {
  try {
    console.info("[ensureAnonymousSession] checking for existing session…");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      console.info("[ensureAnonymousSession] existing session found, skipping sign-in", {
        userId: session.user.id,
      });
      return;
    }

    console.info("[ensureAnonymousSession] no session, calling signInAnonymously()…");
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[ensureAnonymousSession] signInAnonymously failed:", error.message);
      return;
    }
    console.info("[ensureAnonymousSession] signed in anonymously", { userId: data.user?.id });
  } catch (err) {
    console.error("[ensureAnonymousSession] unexpected error:", err);
  }
}
