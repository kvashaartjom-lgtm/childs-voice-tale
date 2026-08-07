/**
 * Stubbed API layer. Every function here returns mock data after a fake delay.
 * Replace the bodies with real fetch/server-function calls later — the
 * signatures are the contract used by the UI.
 */

import type { OrderState, IllustrationStyleId } from "./order-store";

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

const MOCK_TEXTS = [
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

export async function generateBook(order: OrderState): Promise<GeneratedBook> {
  await delay(600);
  const name = order.childName?.trim() || "Sam";
  return {
    id: `book_${Math.random().toString(36).slice(2, 9)}`,
    title: `${name} en de Gouden Lantaarn`,
    spreads: MOCK_TEXTS.map((text, index) => ({
      id: `spread_${index + 1}`,
      pageLabel: `Pagina ${index * 2 + 3}–${index * 2 + 4}`,
      imageUrl: mockIllustration(order.styleId, index),
      text: text.replaceAll("{name}", name),
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

export async function joinWaitlist(email: string): Promise<{ ok: true }> {
  await delay(900);
  if (typeof window !== "undefined") {
    const stored = JSON.parse(window.localStorage.getItem("kidstory_waitlist") || "[]");
    window.localStorage.setItem("kidstory_waitlist", JSON.stringify([...stored, email]));
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
    return index % 2 === 0 ? primary : POOL[index % POOL.length];
  }
  return POOL[index % POOL.length];
}

export function illustrationVariants(index: number) {
  return [POOL[index % POOL.length], POOL[(index + 1) % POOL.length], POOL[(index + 3) % POOL.length]];
}
