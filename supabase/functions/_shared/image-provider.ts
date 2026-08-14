// Provider abstraction for the async generation worker's page-image step
// (AD-004: printer/provider abstraction exists from day one, applied here
// to the image-generation provider too). Selected via the IMAGE_PROVIDER
// env var; defaults to "mock". The Gemini implementation is a stub — the
// free-tier quota is exhausted (docs/33-DEFERRED.md) and is not exercised
// by this task. This task validates orchestration, not AI output.

export interface GeneratedImage {
  bytes: Uint8Array;
  contentType: string;
  /** File extension without the dot, used to build the Storage object key. */
  extension: string;
}

export interface PageGenerationInput {
  bookVersionId: string;
  pageNumber: number;
  text: string;
}

export interface ImageProvider {
  readonly name: string;
  generatePage(input: PageGenerationInput): Promise<GeneratedImage>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

// Testing hooks ONLY, deliberately triggered by the manual verification
// script to exercise the retry/permanent-failure paths without needing a
// real flaky provider. Documented here, not a hidden backdoor — see the
// "failure path" section of the verification script in the task report.
const FORCE_TRANSIENT = "__FORCE_TRANSIENT_ERROR__";
const FORCE_PERMANENT = "__FORCE_PERMANENT_ERROR__";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Deterministic, verifiable placeholder: the SVG visibly renders the exact
// book_version_id and page_number it was called with, so a specific
// generated file can be proven to correspond to a specific job/page rather
// than merely "a file exists". SVG (not PNG) because Deno's Edge Function
// runtime has no canvas/raster-drawing primitive without a heavy extra
// dependency, and rendering text into an SVG or PNG is explicitly
// permitted by the task — SVG is trivially verifiable by downloading and
// reading the file as text.
function renderMockSvg({ bookVersionId, pageNumber, text }: PageGenerationInput): string {
  const snippet = escapeXml(text.slice(0, 140));
  const generatedAt = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
  <rect width="1024" height="576" fill="#1C1A2E" />
  <rect x="24" y="24" width="976" height="528" fill="none" stroke="#D4903A" stroke-width="4" />
  <text x="52" y="90" font-family="monospace" font-size="28" fill="#F2EDD8">MOCK PAGE IMAGE</text>
  <text x="52" y="140" font-family="monospace" font-size="20" fill="#D4903A">book_version_id: ${escapeXml(bookVersionId)}</text>
  <text x="52" y="172" font-family="monospace" font-size="20" fill="#D4903A">page_number: ${pageNumber}</text>
  <text x="52" y="204" font-family="monospace" font-size="16" fill="#C8547E">generated_at: ${generatedAt}</text>
  <text x="52" y="260" font-family="monospace" font-size="14" fill="#F2EDD8">${snippet}</text>
</svg>`;
}

class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generatePage(input: PageGenerationInput): Promise<GeneratedImage> {
    // Artificial delay so timing behaves like a real network-bound provider
    // (the worker's ~100s budget/resumption logic is otherwise untestable).
    await sleep(500 + Math.floor(Math.random() * 500));

    if (input.text.includes(FORCE_TRANSIENT)) {
      throw new ProviderError("mock: simulated transient provider failure", true);
    }
    if (input.text.includes(FORCE_PERMANENT)) {
      throw new ProviderError("mock: simulated permanent validation failure", false);
    }

    const svg = renderMockSvg(input);
    return {
      bytes: new TextEncoder().encode(svg),
      contentType: "image/svg+xml",
      extension: "svg",
    };
  }
}

class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";

  generatePage(_input: PageGenerationInput): Promise<GeneratedImage> {
    // Not configured, not exercised by this task. Gemini's free tier is
    // quota-blocked (docs/33-DEFERRED.md); a real implementation is later
    // work, not part of this orchestration-only task.
    return Promise.reject(new ProviderError("gemini provider not configured", false));
  }
}

export function getImageProvider(): ImageProvider {
  const selected = Deno.env.get("IMAGE_PROVIDER") ?? "mock";
  if (selected === "gemini") return new GeminiImageProvider();
  return new MockImageProvider();
}
