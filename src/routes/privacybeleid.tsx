import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl text-cream">{t("privacy.title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("privacy.intro")}</p>
        <div className="mt-8 space-y-6 text-cream/85">
          <section>
            <h2 className="font-display text-2xl text-cream">{t("privacy.photosTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("privacy.photosText")}
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">{t("privacy.voiceTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("privacy.voiceText")}
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">{t("privacy.aiTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("privacy.aiText")}
            </p>
          </section>
        </div>
        <Link to="/" className="mt-10 inline-block text-sm text-gold hover:underline">
          {t("common.backToHome")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
