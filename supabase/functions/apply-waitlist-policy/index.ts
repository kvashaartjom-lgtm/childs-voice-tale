// Recreate policy fresh, test inline via PostgREST, report.
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

Deno.serve(async () => {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const sql = postgres(dbUrl, { max: 1 });

  try {
    // Drop and recreate the policy to ensure it's fresh
    await sql`DROP POLICY IF EXISTS "anon_insert_only" ON public.waitlist`;
    await sql`
      CREATE POLICY "anon_insert_only" ON public.waitlist
        AS PERMISSIVE
        FOR INSERT
        TO anon
        WITH CHECK (true)
    `;
    await sql`GRANT INSERT ON TABLE public.waitlist TO anon`;
    await sql`NOTIFY pgrst, 'reload schema'`;

    // Wait a moment for PostgREST to reload
    await new Promise((r) => setTimeout(r, 2000));

    // Verify policy was created
    const policy = await sql`
      SELECT polname, polcmd, polroles, polpermissive
      FROM pg_policy
      WHERE polrelid = 'public.waitlist'::regclass
    `;

    await sql.end();

    // Now test via PostgREST
    const testEmail = `fn-post-recreate-${Date.now()}@test.dev`;
    const res = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ email: testEmail }),
    });
    const body = await res.text();
    let parsed: unknown = body;
    try { parsed = JSON.parse(body); } catch { /* keep as string */ }

    return new Response(
      JSON.stringify({ policy, postgrestStatus: res.status, postgrestBody: parsed }, null, 2),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    await sql.end({ timeout: 1 });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
