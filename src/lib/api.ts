/**
 * Stubbed API layer. Every function here returns mock data after a fake delay.
 * Replace the bodies with real fetch/server-function calls later — the
 * signatures are the contract used by the UI.
 */

import type { OrderState, IllustrationStyleId } from "./order-store";
import i18n from "@/i18n";

export interface BookSpread {
  id: string;
  pageLabel: string;
  imageUrl: string;
  text: string;
  hasQrCode?: boolean;
}

export interface GeneratedBook {
  id: string;
  title: string;
  spreads: BookSpread[];
}

export interface CreatedOrder {
  id: string;
  total: number;
  estimatedDelivery: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const BOOK_PRICE = 34.99;

export function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

const MOCK_TEXTS_NL = [
  "Op een winderige woensdagochtend hoorde {name} een zacht getik tegen het raam. Buiten stond een lantaarn te wachten die niemand daar had gezet.",
  "«Kom je mee?» fluisterde het licht. {name} trok de laarzen aan en stapte de tuin in, waar het gras plotseling naar sterren rook.",
  "Achter de heg begon een pad van goud. Elke stap gaf een klein rinkelend geluid, alsof de grond meezong met het verhaal van de familie.",
  "Bij de oude eik zat een uil met een bril op. «Ik bewaar alle verhalen van jouw familie», zei hij. «Maar één ervan ben ik kwijt.»",
  "{name} dacht aan de dag waarop opa dat ene verhaal vertelde. De woorden kwamen terug, warm en vertrouwd, precies zoals thuis.",
  "Samen liepen ze naar het meer waar de maan in stukjes lag. {name} raapte de stukjes op en maakte er een lamp van voor de uil.",
  "«Verhalen verdwijnen nooit», zei de uil zacht, «zolang iemand ze blijft vertellen.» En zijn veren glansden goud in het maanlicht.",
  "Toen {name} weer thuiskwam, stond de lantaarn stil naast het bed. Binnenin flakkerde een klein vlammetje: het verhaal van de familie.",
  "De volgende ochtend rook de keuken naar pannenkoeken. «Heb je mooi gedroomd?» vroeg mama. {name} glimlachte en knikte heel langzaam.",
  "En elke avond, als het donker werd, klonk de stem van opa weer door de kamer. Voor altijd bewaard, tussen de bladzijden van dit boek.",
];

const MOCK_TEXTS_EN = [
  "On a windy Wednesday morning, {name} heard a soft tapping at the window. Outside, a lantern was waiting that nobody had placed there.",
  "«Come along?» whispered the light. {name} pulled on boots and stepped into the garden, where the grass suddenly smelled of stars.",
  "Behind the hedge a golden path began. Every step made a small tinkling sound, as if the ground were singing the family's story.",
  "By the old oak sat an owl wearing spectacles. «I keep all the stories of your family», he said. «But one of them I have lost.»",
  "{name} thought of the day when grandpa told that very story. The words came back, warm and familiar, just like home.",
  "Together they walked to the lake where the moon lay in pieces. {name} gathered the pieces and made a lamp from them for the owl.",
  "«Stories never disappear», said the owl softly, «as long as someone keeps telling them.» His feathers gleamed gold in the moonlight.",
  "When {name} came home again, the lantern stood still beside the bed. Inside, a small flame flickered: the story of the family.",
  "The next morning the kitchen smelled of pancakes. «Did you have a lovely dream?» asked mum. {name} smiled and nodded very slowly.",
  "And every evening, when darkness fell, grandpa's voice filled the room once more. Kept forever, between the pages of this book.",
];

interface StorySpread {
  spreadNumber: number;
  text: string;
}

async function fetchStoryTexts(order: OrderState, name: string, language: string): Promise<string[] | null> {
  // Only call the edge function when the user typed their story (voice transcription is future work)
  if (order.storyMode !== "type" || order.storyText.trim().length < 40) return null;

  try {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase.functions.invoke("generate-story", {
      body: {
        childName: name,
        ageBracket: order.ageBracket ?? "3-5",
        storyText: order.storyText,
        language,
      },
    });

    if (error || !Array.isArray(data?.spreads)) return null;

    return (data.spreads as StorySpread[])
      .sort((a, b) => a.spreadNumber - b.spreadNumber)
      .map((s) => s.text);
  } catch {
    return null;
  }
}

export async function generateBook(order: OrderState): Promise<GeneratedBook> {
  const name = order.childName?.trim() || "Sam";
  // Read directly from localStorage to avoid race with root useEffect restoring language.
  // On SSR window is undefined → falls back to i18n.language (always "nl" during SSR).
  const stored = typeof window !== "undefined" ? localStorage.getItem("kidstory_lang") : null;
  const language = (stored === "en" || i18n.language === "en") ? "en" : "nl";
  const isEn = language === "en";

  // Real story generation — falls back to mock silently on any error
  const realTexts = await fetchStoryTexts(order, name, language);

  if (!realTexts) await delay(600);

  const mockTexts = isEn ? MOCK_TEXTS_EN : MOCK_TEXTS_NL;
  const title = isEn ? `${name} and the Golden Lantern` : `${name} en de Gouden Lantaarn`;

  return {
    id: `book_${Math.random().toString(36).slice(2, 9)}`,
    title,
    spreads: mockTexts.map((mockText, index) => ({
      id: `spread_${index + 1}`,
      pageLabel: isEn ? `Page ${index * 2 + 3}–${index * 2 + 4}` : `Pagina ${index * 2 + 3}–${index * 2 + 4}`,
      imageUrl: mockIllustration(order.styleId, index),
      text: realTexts?.[index] ?? mockText.replaceAll("{name}", name),
      hasQrCode: index === 1 || index === 5 || index === 9,
    })),
  };
}

export async function regenerateIllustration(
  spreadId: string,
  variantUrl: string,
): Promise<{ spreadId: string; imageUrl: string }> {
  await delay(1400);
  return { spreadId, imageUrl: variantUrl };
}

export async function cloneVoice(_recordingSeconds: number): Promise<{ voiceId: string }> {
  await delay(1200);
  return { voiceId: `voice_${Math.random().toString(36).slice(2, 9)}` };
}

export async function createOrder(_order: OrderState): Promise<CreatedOrder> {
  await delay(2200);
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 6);
  return {
    id: `KS-${Math.floor(100000 + Math.random() * 899999)}`,
    total: BOOK_PRICE,
    estimatedDelivery: delivery.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(email: string): Promise<{ ok: true }> {
  if (!EMAIL_RE.test(email)) throw new Error("invalid_email");

  const { supabaseUrl, supabaseAnonKey } = await import("./supabase");
  const res = await fetch(`${supabaseUrl}/functions/v1/join-waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[joinWaitlist]", res.status, body);
    throw new Error("network_error");
  }

  return { ok: true };
}

// Mock illustration pool — swapped for real generated art later.
import aquarel from "@/assets/style-aquarel.jpg";
import tekenfilm from "@/assets/style-tekenfilm.jpg";
import sprookje from "@/assets/style-sprookjesachtig.jpg";
import realistisch from "@/assets/style-realistisch.jpg";
import grandparent from "@/assets/grandparent.jpg";

export const STYLE_IMAGES: Record<IllustrationStyleId, string> = {
  aquarel,
  tekenfilm,
  sprookjesachtig: sprookje,
  realistisch,
};

const POOL = [aquarel, sprookje, grandparent, tekenfilm, realistisch];

export function mockIllustration(styleId: IllustrationStyleId | null, index: number) {
  if (styleId) {
    const primary = STYLE_IMAGES[styleId];
    return index % 2 === 0 ? primary : POOL[index % POOL.length]!;
  }
  return POOL[index % POOL.length]!;
}

export function illustrationVariants(index: number) {
  return [
    POOL[index % POOL.length]!,
    POOL[(index + 1) % POOL.length]!,
    POOL[(index + 3) % POOL.length]!,
  ];
}
