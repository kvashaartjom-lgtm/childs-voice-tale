import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { email } = await req.json();
    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // Service role key bypasses RLS — safe here because this is a public append-only table.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("waitlist").insert({ email });

    if (error) {
      // 23505 = unique_violation — already registered, return success
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...CORS },
        });
      }
      console.error("[join-waitlist]", error.code, error.message);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (err) {
    console.error("[join-waitlist] unexpected", err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
