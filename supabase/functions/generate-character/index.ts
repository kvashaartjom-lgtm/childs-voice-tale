import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callImageModel, ImageGenError } from "../_shared/imagegen.ts";
import { characterSheetPrompt, isStyleId } from "../_shared/prompts.ts";
import { corsHeaders } from "../_shared/cors.ts";

// ВНИМАНИЕ. Это единственное место в системе, куда попадает фото ребёнка.
// Оно приходит в теле запроса, уходит в модель и умирает вместе с этим
// обработчиком. Не сохранять. Не логировать. Не класть в текст ошибки.

const MAX_PHOTO_BYTES = 2_500_000; // ~1024px JPEG q0.9 с большим запасом

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

  let jobId: string | null = null;

  try {
    const body = await req.json();
    const { photo, styleId, pageCount } = body ?? {};

    if (!isStyleId(styleId)) return json({ error: "invalid_style" }, 400);
    if (!photo?.data || typeof photo.data !== "string") {
      return json({ error: "photo_required" }, 400);
    }
    if (photo.data.length > MAX_PHOTO_BYTES) {
      return json({ error: "photo_too_large" }, 413);
    }
    const pages = Number.isInteger(pageCount) && pageCount > 0 && pageCount <= 32
      ? pageCount
      : 16;

    const { data: job, error: jobErr } = await supabase
      .from("book_jobs")
      .insert({ style_id: styleId, page_count: pages, status: "character_pending" })
      .select("id")
      .single();
    if (jobErr) throw new Error(`db: ${jobErr.message}`);
    jobId = job.id;

    const sheet = await callImageModel(
      characterSheetPrompt(styleId),
      [{ mimeType: photo.mimeType ?? "image/jpeg", data: photo.data }],
    );

    // С этой строки фото больше нигде не участвует.
    const bytes = Uint8Array.from(atob(sheet.data), (c) => c.charCodeAt(0));
    const path = `${jobId}/sheet.png`;
    const { error: upErr } = await supabase.storage
      .from("characters")
      .upload(path, bytes, { contentType: sheet.mimeType, upsert: true });
    if (upErr) throw new Error(`storage: ${upErr.message}`);

    await supabase.from("book_jobs").update({ status: "character_ready" }).eq("id", jobId);

    const { data: signed } = await supabase.storage
      .from("characters").createSignedUrl(path, 3600);

    return json({ jobId, characterUrl: signed?.signedUrl ?? null, pageCount: pages });
  } catch (e) {
    const known = e instanceof ImageGenError;
    const message = known ? e.message : "generation_failed";
    if (jobId) {
      await supabase.from("book_jobs")
        .update({ status: "failed", error: message }).eq("id", jobId);
    }
    // Логируем только сообщение, никогда не объект запроса.
    console.error("generate-character:", message);
    return json({ error: message, jobId }, known ? e.status : 500);
  }
});
