const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Language = "nl" | "en";

function buildSystemPrompt(language: Language): string {
  const isNl = language === "nl";

  const intro = isNl
    ? "You are a professional Dutch children's book author. You transform real family memories into warm, magical fairy tales in natural, literary Dutch — the kind found in a premium Dutch picture book."
    : "You are a professional English children's book author. You transform real family memories into warm, magical fairy tales in natural, literary English — the kind found in a premium English picture book.";

  const langRule = isNl
    ? "Write in natural, warm, literary Dutch (not translated; native-quality Dutch prose)."
    : "Write in natural, warm, literary English (not translated; native-quality English prose).";

  return `${intro}

Rules:
- The child mentioned in the request is the hero of the story. Use their name naturally throughout.
- ${langRule}
- The story spans exactly 10 spreads.
- Follow the age-based length guide below for the given age bracket.
- Keep the real emotional core of the family story; weave in magical, fairy-tale elements organically.
- End on a warm, memorable note that ties back to the family.
- Respond with ONLY valid JSON — an array of exactly 10 objects, each with "spreadNumber" (integer 1–10) and "text" (string). No markdown fences, no extra keys, no explanation outside the JSON.

Age-based length guide:
- 0-1 years: 0–5 words per spread; onomatopoeia and gentle sound words only
- 1-2 years: 5–15 words per spread; very short, rhythmic sentences
- 2-3 years: 15–30 words per spread; clear beginning–middle–end structure
- 3-5 years: 30–60 words per spread; a simple problem and its resolution
- 5-7 years: 60–120 words per spread; dialogue between characters
- 7-8 years: 120–200 words per spread; develop the hero's inner world and character growth`;
}

interface SpreadResult {
  spreadNumber: number;
  text: string;
}

/**
 * Single point of change for swapping LLM providers.
 * To switch to Claude: replace the fetch body and parse the response accordingly.
 * Returns the raw text content from the model.
 */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Key is an opaque string — never validate its format, only the API can do that.
  // Use x-goog-api-key header (native endpoint); does NOT work with OpenAI-compat wrappers.
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              spreadNumber: { type: "integer" },
              text: { type: "string" },
            },
            required: ["spreadNumber", "text"],
          },
        },
        maxOutputTokens: 8192,
      },
    }),
  });

  if (res.status === 429) throw new Error("rate_limit");

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`llm_error_${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty_response");
  return text;
}

function parseSpreads(raw: string): SpreadResult[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 10) {
    throw new Error(`invalid_structure: expected 10 spreads, got ${Array.isArray(parsed) ? parsed.length : "non-array"}`);
  }
  return parsed as SpreadResult[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let language: Language = "nl";

  try {
    const { childName, ageBracket, storyText, language: rawLang } = await req.json();

    language = rawLang === "en" ? "en" : "nl";

    if (!childName || !ageBracket || !storyText) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: childName, ageBracket, storyText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = buildSystemPrompt(language);
    const userMessage =
      `Child's name: ${childName}\nAge bracket: ${ageBracket}\n\nFamily story to transform:\n${storyText}`;

    let spreads: SpreadResult[];

    try {
      const raw = await callLLM(systemPrompt, userMessage);
      spreads = parseSpreads(raw);
    } catch (firstErr) {
      // Don't retry rate limits — propagate immediately
      if (firstErr instanceof Error && firstErr.message === "rate_limit") throw firstErr;

      console.warn("[generate-story] first attempt failed, retrying:", firstErr);
      const raw = await callLLM(systemPrompt, userMessage);
      spreads = parseSpreads(raw);
    }

    const sorted = spreads.sort((a, b) => a.spreadNumber - b.spreadNumber);

    return new Response(JSON.stringify({ spreads: sorted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-story]", err);
    const message = err instanceof Error ? err.message : "internal_error";
    const isRateLimit = message === "rate_limit";
    const rateLimitMsg = language === "en"
      ? "Too many requests — please try again in a minute."
      : "Te veel verzoeken — probeer het over een minuut opnieuw.";
    return new Response(
      JSON.stringify({ error: isRateLimit ? rateLimitMsg : message }),
      { status: isRateLimit ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
