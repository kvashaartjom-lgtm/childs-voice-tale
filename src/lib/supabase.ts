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
