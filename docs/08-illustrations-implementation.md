# KidStory AI — Иллюстрации: реализация

> Этап 1 MVP. Провайдер: `gemini-2.5-flash-image` (Google, тот же ключ, что у `generate-story`).
> Схема: фото → character sheet (1 вызов) → страницы (N вызовов от sheet).
> Дата: август 2026

---

## Ключевые принципы этой задачи

1. **Фото ребёнка не касается диска.** Ресайз в браузере → base64 inline в Edge Function → Gemini → ответ. Ни бакета, ни presigned URL, ни джобы на удаление.
2. **Фото не попадает в логи.** Ни `console.log` тела запроса, ни в текст ошибки, ни в таблицу.
3. **В БД нет персональных данных.** `book_jobs` хранит стиль, счётчик страниц и статус. Имя ребёнка — только в клиентском стейте.
4. **Стиль «реализм» не реализуем.** Реалистичный стиль + настоящее лицо = запрещено собственным продуктовым правилом и рискованно по EU AI Act.
5. **Дизайн, JSX и UI-тексты не трогаем.** Только `lib/`, новые файлы и Edge Functions.

---

## Этап 0 — Bake-off (до продуктового кода)

Цель: понять, годится ли Gemini для акварельного детского лица, **прежде** чем встраивать его в продукт. Скрипт живёт вне репозитория, в продакшн не идёт.

### Файл: `tools/bakeoff/run.mjs`

```js
// Локальный bake-off. Не часть продукта, в репозиторий продукта не коммитить.
// Запуск: GEMINI_API_KEY=... node run.mjs ./photo.jpg
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename } from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.IMAGE_MODEL ?? "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

if (!API_KEY) { console.error("GEMINI_API_KEY не задан"); process.exit(1); }

const STYLES = {
  aquarel:
    "soft watercolour picture-book illustration, visible cold-press paper texture, " +
    "gentle transparent washes, warm muted palette, loose confident ink linework",
  cartoon:
    "clean modern cartoon illustration, bold flat colours, simple rounded shapes, " +
    "thick even outlines, cheerful high-contrast palette",
  sprookje:
    "classic European storybook illustration, painterly and warm, golden light, " +
    "richly detailed backgrounds, gouache feel",
  strip:
    "comic-book illustration, dynamic ink linework, cel shading, saturated colours, " +
    "strong graphic silhouettes",
};

const SCENES = [
  "The character stands at the edge of a quiet forest at dawn, looking up at tall pine trees.",
  "The character sits at a kitchen table holding a mug, warm evening light from a window.",
  "The character runs across a windy beach, arms out, gulls overhead.",
];

function characterPrompt(style) {
  return `Create a character reference sheet for a children's picture book.

The child in the provided photograph is the character. Render them as an original
hand-illustrated character in the style described below. This is an illustration,
not a portrait — do not reproduce photographic detail or texture.

Layout: three views of the same character side by side on a plain off-white
background — front-facing head and shoulders, three-quarter view, and full body
standing. Neutral friendly expression. No text, no labels, no borders, no frames.

Keep recognisable: hair colour and hairstyle, eye colour, skin tone, approximate
age, and any distinctive feature such as glasses or freckles.
Clothing: a simple red jumper and blue trousers, identical in all three views.

Style: ${STYLES[style]}`;
}

function pagePrompt(style, scene) {
  return `Illustrate one page of a children's picture book.

The provided reference sheet defines the main character. Reproduce that character
exactly — same face, same hair, same clothing, same proportions. Do not restyle,
do not age, do not change the outfit.

Scene: ${scene}

Composition: full-bleed illustration, landscape orientation. Leave a calm,
low-detail area in the lower third of the frame where book text will be placed.
No text, no lettering, no speech bubbles, no page numbers anywhere in the image.

Style: ${STYLES[style]} — identical to the reference sheet.`;
}

async function generate(prompt, refs = []) {
  const parts = [
    ...refs.map((r) => ({ inline_data: { mime_type: r.mimeType, data: r.data } })),
    { text: prompt },
  ];
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      // Если модель ответит 400 на responseModalities — попробуй ["TEXT","IMAGE"].
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData ?? p.inline_data,
  );
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) {
    throw new Error(`нет изображения, finishReason=${json?.candidates?.[0]?.finishReason}`);
  }
  return { mimeType: inline.mimeType ?? inline.mime_type ?? "image/png", data: inline.data };
}

const save = async (dir, name, img) => {
  await mkdir(dir, { recursive: true });
  const ext = img.mimeType.includes("jpeg") ? "jpg" : "png";
  await writeFile(`${dir}/${name}.${ext}`, Buffer.from(img.data, "base64"));
};

const photoPath = process.argv[2];
if (!photoPath) { console.error("Укажи путь к фото"); process.exit(1); }

const photo = {
  mimeType: photoPath.endsWith(".png") ? "image/png" : "image/jpeg",
  data: (await readFile(photoPath)).toString("base64"),
};

const out = `./out/${basename(photoPath).replace(/\.\w+$/, "")}`;
console.log(`Фото: ${photoPath} → ${out}\n`);

for (const style of Object.keys(STYLES)) {
  try {
    const t0 = Date.now();
    const sheet = await generate(characterPrompt(style), [photo]);
    await save(`${out}/${style}`, "00-sheet", sheet);
    console.log(`${style}: sheet ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    for (const [i, scene] of SCENES.entries()) {
      const t1 = Date.now();
      const page = await generate(pagePrompt(style, scene), [sheet]);
      await save(`${out}/${style}`, `0${i + 1}-page`, page);
      console.log(`${style}: page ${i + 1} ok (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
      await new Promise((r) => setTimeout(r, 4000)); // бережём RPM
    }
  } catch (e) {
    console.error(`${style}: ОШИБКА — ${e.message}`);
  }
  console.log("");
}
```

### Что смотреть в результатах

| Критерий | Провал = переходим на Seedream/flux-kontext |
|---|---|
| Лицо на страницах узнаётся как тот же ребёнок | нет — сразу план Б |
| Одежда и причёска не «плывут» между страницами | плывут на 2 из 3 — план Б |
| Стиль одинаковый на всех страницах | нет — усилить style-описание, потом план Б |
| Нижняя треть кадра действительно спокойная | нет — правим промт, не критично |
| Время на страницу | > 25 сек — 16 страниц = 7 мин, надо думать о UX ожидания |

**Не переходи к этапу 1, пока bake-off не выглядит приемлемо.** Иначе построишь инфраструктуру вокруг того, что не работает.

---

## Этап 1 — Инфраструктура

### Бриф для Claude Code

```
Задача: подготовить инфраструктуру для генерации иллюстраций.
UI, JSX, Tailwind, нидерландские тексты — НЕ ТРОГАТЬ.

1. Миграция БД (новый файл в supabase/migrations):

create table if not exists public.book_jobs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  style_id     text not null,
  page_count   int  not null,
  status       text not null default 'pending',
  error        text
);
alter table public.book_jobs enable row level security;
-- Политик намеренно нет: доступ только service-role из Edge Functions.

insert into storage.buckets (id, name, public)
values ('characters','characters',false), ('pages','pages',false)
on conflict (id) do nothing;

ВАЖНО: в book_jobs не должно появиться ни одного поля с персональными
данными — ни имени ребёнка, ни email, ни возраста. Имя живёт только в
клиентском стейте и в промте, который никуда не пишется.

2. Создать supabase/functions/_shared/imagegen.ts — код ниже, взять дословно.

3. Создать supabase/functions/_shared/prompts.ts — код ниже, взять дословно.

4. Создать supabase/functions/_shared/cors.ts, если такого ещё нет:
   стандартные CORS-заголовки + обработка OPTIONS, по образцу
   существующей generate-story.

После: npm run build, коммит. Пуш со сломанным билдом запрещён.
```

### Файл: `supabase/functions/_shared/imagegen.ts`

```ts
// Абстракция генерации изображений.
// Смена провайдера (Replicate/Seedream/flux-kontext) — правка только этого файла.
// НИКОГДА не логировать содержимое refs: там фото ребёнка.

export interface ImagePart {
  mimeType: string;
  /** base64 без data:-префикса */
  data: string;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = Deno.env.get("IMAGE_MODEL") ?? "gemini-2.5-flash-image";

// Некоторые ревизии модели требуют ["TEXT","IMAGE"]. Если ловишь 400 на
// responseModalities — меняй здесь, в одном месте.
const RESPONSE_MODALITIES = ["IMAGE"];

export class ImageGenError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ImageGenError";
  }
}

export async function callImageModel(
  prompt: string,
  refs: ImagePart[] = [],
  opts: { retries?: number } = {},
): Promise<ImagePart> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new ImageGenError("GEMINI_API_KEY не задан", 500, false);

  const body = JSON.stringify({
    contents: [{
      role: "user",
      parts: [
        ...refs.map((r) => ({
          inline_data: { mime_type: r.mimeType, data: r.data },
        })),
        { text: prompt },
      ],
    }],
    generationConfig: { responseModalities: RESPONSE_MODALITIES },
  });

  const maxRetries = opts.retries ?? 3;
  let last: ImageGenError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body,
      });
    } catch (_e) {
      last = new ImageGenError("сеть недоступна", 503, true);
      if (attempt === maxRetries) break;
      await sleep(1500 * 2 ** attempt);
      continue;
    }

    if (res.ok) {
      const json = await res.json();
      const part = json?.candidates?.[0]?.content?.parts?.find(
        (p: Record<string, unknown>) => p.inlineData ?? p.inline_data,
      );
      const inline = (part?.inlineData ?? part?.inline_data) as
        | { data?: string; mimeType?: string; mime_type?: string }
        | undefined;

      if (!inline?.data) {
        // Чаще всего это safety-фильтр Google на детском лице.
        const reason = json?.candidates?.[0]?.finishReason ?? "UNKNOWN";
        throw new ImageGenError(`изображение не вернулось (${reason})`, 502, false);
      }
      return {
        mimeType: inline.mimeType ?? inline.mime_type ?? "image/png",
        data: inline.data,
      };
    }

    // Тело ответа не логируем целиком — в нём может быть эхо запроса.
    const retryable = res.status === 429 || res.status >= 500;
    last = new ImageGenError(`провайдер вернул ${res.status}`, res.status, retryable);
    if (!retryable || attempt === maxRetries) break;
    await sleep(1500 * 2 ** attempt);
  }

  throw last ?? new ImageGenError("неизвестная ошибка генерации", 500, false);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

### Файл: `supabase/functions/_shared/prompts.ts`

```ts
// Промты намеренно на английском: модели заметно лучше следуют
// композиционным инструкциям на нём. Текст книги при этом нидерландский —
// в изображении текста быть не должно вовсе.

export const STYLES = {
  aquarel:
    "soft watercolour picture-book illustration, visible cold-press paper texture, " +
    "gentle transparent washes, warm muted palette, loose confident ink linework",
  cartoon:
    "clean modern cartoon illustration, bold flat colours, simple rounded shapes, " +
    "thick even outlines, cheerful high-contrast palette",
  sprookje:
    "classic European storybook illustration, painterly and warm, golden light, " +
    "richly detailed backgrounds, gouache feel",
  strip:
    "comic-book illustration, dynamic ink linework, cel shading, saturated colours, " +
    "strong graphic silhouettes",
} as const;

export type StyleId = keyof typeof STYLES;
export const isStyleId = (v: unknown): v is StyleId =>
  typeof v === "string" && v in STYLES;

/** Одежда фиксируется один раз и держится на всех страницах. */
const DEFAULT_OUTFIT = "a simple red jumper and blue trousers";

export function characterSheetPrompt(style: StyleId, outfit = DEFAULT_OUTFIT): string {
  return `Create a character reference sheet for a children's picture book.

The child in the provided photograph is the character. Render them as an original
hand-illustrated character in the style described below. This is an illustration,
not a portrait — do not reproduce photographic detail or texture.

Layout: three views of the same character side by side on a plain off-white
background — front-facing head and shoulders, three-quarter view, and full body
standing. Neutral friendly expression. No text, no labels, no borders, no frames.

Keep recognisable: hair colour and hairstyle, eye colour, skin tone, approximate
age, and any distinctive feature such as glasses or freckles.
Clothing: ${outfit}, identical in all three views.

Style: ${STYLES[style]}`;
}

export function pagePrompt(style: StyleId, scene: string): string {
  return `Illustrate one page of a children's picture book.

The provided reference sheet defines the main character. Reproduce that character
exactly — same face, same hair, same clothing, same proportions. Do not restyle,
do not age, do not change the outfit.

Scene: ${scene}

Composition: full-bleed illustration, landscape orientation. Leave a calm,
low-detail area in the lower third of the frame where book text will be placed.
No text, no lettering, no speech bubbles, no page numbers anywhere in the image.

Style: ${STYLES[style]} — identical to the reference sheet.`;
}
```

---

## Этап 2 — `generate-character`

Единственная функция, которая видит фото. Живёт секунды.

### Бриф для Claude Code

```
Создать Edge Function supabase/functions/generate-character/index.ts
по коду ниже. UI не трогать.

Проверить после написания:
- в файле нет ни одного console.log, куда может попасть body.photo
- в book_jobs не пишется ничего, кроме style_id / page_count / status
- npm run build проходит
```

### Файл: `supabase/functions/generate-character/index.ts`

```ts
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
```

---

## Этап 3 — `generate-page`

### Бриф для Claude Code

```
Создать supabase/functions/generate-page/index.ts по коду ниже.
Один вызов = одна страница. Фронтенд вызывает последовательно.
UI не трогать. npm run build перед коммитом.
```

### Файл: `supabase/functions/generate-page/index.ts`

```ts
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
```

**Замечание про `btoa(String.fromCharCode(...))`:** на изображениях >~100 КБ это может упереться в лимит аргументов. Если Claude Code увидит `RangeError` — заменить на чанковую конверсию по 8 КБ. Оставлено в простом виде намеренно, чтобы не усложнять раньше времени.

---

## Этап 4 — Клиентская часть

### Бриф для Claude Code

```
Задача: подключить генерацию иллюстраций на фронтенде.
НЕ ТРОГАТЬ: дизайн, цвета, шрифты, JSX существующих компонентов,
нидерландские тексты, Tailwind-классы. Только логика.

1. Новый файл src/lib/photo.ts — код ниже, дословно.

2. В src/lib/api.ts заменить мок иллюстраций на две функции:

   generateCharacter(photo: File, styleId: string, pageCount: number)
     → ресайз через prepareChildPhoto()
     → POST на функцию generate-character
     → возвращает { jobId, characterUrl, pageCount }

   generatePage(jobId: string, pageIndex: number, scene: string)
     → POST на generate-page
     → возвращает { pageIndex, url }

   Обе — через существующий supabase.functions.invoke, тем же способом,
   каким уже вызывается generate-story.

3. Оркестрация в том месте, где сейчас показываются 5 статичных JPG:
   - вызвать generateCharacter один раз
   - затем ПОСЛЕДОВАТЕЛЬНО generatePage для каждой страницы,
     с задержкой 3000 мс между вызовами (соблюдение RPM бесплатного тарифа)
   - страницы появляются по мере готовности, не ждать все разом
   - при ошибке одной страницы: не прерывать цикл, пометить страницу
     как неудачную, дать возможность повторить именно её
   - существующие 5 JPG оставить как fallback, если генерация упала целиком,
     по образцу тихого fallback в generate-story

4. После вызова generateCharacter — очистить File и любой его base64
   из React Context немедленно, не дожидаясь оформления заказа.

5. npm run build. Пуш со сломанным билдом запрещён.
```

### Файл: `src/lib/photo.ts`

```ts
/**
 * Подготовка фото ребёнка к отправке в генерацию.
 *
 * Ресайз через canvas решает три задачи разом:
 *  - размер укладывается в тело запроса Edge Function
 *  - EXIF (включая GPS-координаты) не переживает перерисовку
 *  - модели всё равно не нужен исходник с телефона
 *
 * Возвращённый объект живёт только в памяти до вызова generate-character.
 */
export interface PreparedPhoto {
  mimeType: string;
  /** base64 без data:-префикса */
  data: string;
}

export async function prepareChildPhoto(
  file: File,
  maxSide = 1024,
): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  // Затираем холст сразу — не оставляем пиксели ребёнка в живой ноде.
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("encode_failed");

  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return { mimeType: "image/jpeg", data: btoa(binary) };
}
```

---

## Дополнение в `CLAUDE.md` репозитория

```md
## Фото ребёнка — уточнение (иллюстрации)

Фото НЕ загружается в Supabase Storage. Поток: браузер → ресайз до 1024px
через canvas → base64 в теле запроса к Edge Function `generate-character` →
модель → ответ. Диска фото не касается.

Это сознательное отклонение от правила «только presigned upload»: здесь
storage вообще не участвует, и удалять нечего.

Запрещено:
- сохранять фото или его base64 в Storage, БД, localStorage, sessionStorage
- логировать тело запроса к generate-character
- включать содержимое фото в текст ошибки
- добавлять персональные поля в таблицу book_jobs

Character sheet (стилизованный рисунок) хранить можно — это то, что
продуктовая политика прямо разрешает вместо face-embedding.
```

---

## Открытые хвосты (не блокируют этап 1)

| Что | Когда |
|---|---|
| Cron-очистка бакетов `characters` / `pages` через 30 дней | до первых реальных заказов |
| Email-подтверждение (Resend) — привязать к успеху `generate-character` | следующая задача |
| Разбиение текста сказки на сцены (`scene` для каждой страницы) — сейчас предполагается, что это делает `generate-story` | проверить, отдаёт ли она уже посценно |
| Платный ключ Gemini | до первого реального клиента |
| Автоматическая оценка сходства лица | **не делать** — конфликтует с запретом на face-embedding |
