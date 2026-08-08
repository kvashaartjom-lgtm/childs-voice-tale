import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl text-cream">{t("terms.title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("terms.intro")}</p>
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="font-display text-2xl text-cream">{t("terms.orderTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("terms.orderText")}
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">{t("terms.deliveryTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("terms.deliveryText")}
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">{t("terms.personalTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("terms.personalText")}
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
