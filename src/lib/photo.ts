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
