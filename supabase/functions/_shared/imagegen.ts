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
