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
