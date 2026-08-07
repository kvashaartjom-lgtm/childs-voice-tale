import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/voorwaarden")({
  head: () => ({
    meta: [
      { title: "Algemene voorwaarden — KidStory AI" },
      {
        name: "description",
        content:
          "De voorwaarden voor het bestellen van een gepersonaliseerd KidStory AI-boek: levering, retour en gebruik.",
      },
      { property: "og:title", content: "Algemene voorwaarden — KidStory AI" },
      {
        property: "og:description",
        content: "Voorwaarden voor bestellen, levering en retour van een persoonlijk KidStory-boek.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl text-cream">Algemene voorwaarden</h1>
        <p className="mt-4 text-muted-foreground">
          Dit is een voorbeeldpagina van de prototypeversie. Hier komen de volledige voorwaarden.
        </p>
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="font-display text-2xl text-cream">Bestellen en betalen</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Een boek kost €34,99 inclusief btw en verzending binnen Nederland.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Levering</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Levering vindt plaats binnen 4–6 werkdagen na definitieve goedkeuring van het voorbeeld.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Persoonlijk product</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Omdat elk boek op maat wordt gemaakt, is retourneren na goedkeuring niet mogelijk.
            </p>
          </section>
        </div>
        <Link to="/" className="mt-10 inline-block text-sm text-gold hover:underline">
          ← Terug naar home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
