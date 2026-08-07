import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacybeleid")({
  head: () => ({
    meta: [
      { title: "Privacybeleid — KidStory AI" },
      {
        name: "description",
        content:
          "Hoe KidStory AI omgaat met de foto, stem en gegevens van jouw gezin: verwijderd na verwerking, nooit gebruikt voor AI-training.",
      },
      { property: "og:title", content: "Privacybeleid — KidStory AI" },
      {
        property: "og:description",
        content: "Foto en stemopname worden na verwerking verwijderd. Geen AI-training op jullie data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl text-cream">Privacybeleid</h1>
        <p className="mt-4 text-muted-foreground">
          Dit is een voorbeeldpagina van de prototypeversie. In de definitieve versie staat hier het
          volledige privacybeleid.
        </p>
        <div className="mt-8 space-y-6 text-cream/85">
          <section>
            <h2 className="font-display text-2xl text-cream">Foto's van je kind</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              De geüploade foto wordt uitsluitend gebruikt om de illustraties te maken en wordt direct
              daarna verwijderd. Je ontvangt hiervan een bevestiging per e-mail.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Stemopnames</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Opnames worden gebruikt om het verhaal te schrijven en de voorleesstem te maken. De
              originele opname wordt na verwerking verwijderd.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Geen AI-training</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Jullie foto's, stemmen en verhalen worden nooit gebruikt om AI-modellen te trainen.
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
