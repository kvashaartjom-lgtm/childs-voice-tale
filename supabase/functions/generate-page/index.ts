import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callImageModel, ImageGenError } from "../_shared/imagegen.ts";
import { pagePrompt, isStyleId } from "../_shared/prompts.ts";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { jobId, pageIndex, scene } = (await req.json()) ?? {};
    if (typeof jobId !== "string") return json({ error: "job_required" }, 400);
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex > 31) {
      return json({ error: "invalid_page_index" }, 400);
    }
    if (typeof scene !== "string" || scene.length < 10 || scene.length > 800) {
      return json({ error: "invalid_scene" }, 400);
    }

    const { data: job, error: jobErr } = await supabase
      .from("book_jobs").select("style_id, status").eq("id", jobId).single();
    if (jobErr || !job) return json({ error: "job_not_found" }, 404);
    if (!isStyleId(job.style_id)) return json({ error: "invalid_style" }, 500);
    if (job.status === "failed") return json({ error: "job_failed" }, 409);

    const { data: sheetBlob, error: dlErr } = await supabase.storage
      .from("characters").download(`${jobId}/sheet.png`);
    if (dlErr || !sheetBlob) return json({ error: "character_sheet_missing" }, 409);

    const sheetB64 = btoa(
      String.fromCharCode(...new Uint8Array(await sheetBlob.arrayBuffer())),
    );

    const page = await callImageModel(
      pagePrompt(job.style_id, scene),
      [{ mimeType: "image/png", data: sheetB64 }],
    );

    const bytes = Uint8Array.from(atob(page.data), (c) => c.charCodeAt(0));
    const path = `${jobId}/${String(pageIndex).padStart(2, "0")}.png`;
    const { error: upErr } = await supabase.storage
      .from("pages").upload(path, bytes, { contentType: page.mimeType, upsert: true });
    if (upErr) throw new Error(`storage: ${upErr.message}`);

    const { data: signed } = await supabase.storage
      .from("pages").createSignedUrl(path, 3600);

    return json({ pageIndex, url: signed?.signedUrl ?? null });
  } catch (e) {
    const known = e instanceof ImageGenError;
    const message = known ? e.message : "generation_failed";
    console.error("generate-page:", message);
    return json({ error: message }, known ? e.status : 500);
  }
});
