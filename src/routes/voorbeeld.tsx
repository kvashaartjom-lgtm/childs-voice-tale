import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QrCode, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SpreadViewer } from "@/components/SpreadViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder } from "@/lib/order-store";
import { BOOK_PRICE, formatEuro, generateBook, type BookSpread } from "@/lib/api";

export const Route = createFileRoute("/voorbeeld")({
  head: () => ({
    meta: [
      { title: "Jullie boek bekijken en bijschaven | KidStory AI" },
      {
        name: "description",
        content:
          "Blader door alle pagina's, pas de tekst aan, genereer illustraties opnieuw en zie waar de QR-codes met familiestemmen komen.",
      },
      { property: "og:title", content: "Voorbeeld van jullie boek — KidStory AI" },
      {
        property: "og:description",
        content: "Bekijk elke spread, bewerk de tekst en kies andere illustraties voor het drukken.",
      },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { t } = useTranslation();
  const { order, update } = useOrder();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!order.book);
  const isDemo = !order.childName.trim();

  useEffect(() => {
    if (order.book) return;
    let active = true;
    // Demo fallback so /voorbeeld is shareable without walking the wizard.
    generateBook(order).then((book) => {
      if (!active) return;
      update({ book });
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUpdateSpread = (spreadId: string, patch: Partial<BookSpread>) => {
    if (!order.book) return;
    update({
      book: {
        ...order.book,
        spreads: order.book.spreads.map((s) => (s.id === spreadId ? { ...s, ...patch } : s)),
      },
    });
  };

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 py-12">
        <Link
          to="/bestellen"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-cream"
        >
          {t("preview.backToWizard")}
        </Link>

        <header className="text-center">
          <h1 className="font-display text-3xl text-cream sm:text-4xl">{t("preview.title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {order.book?.title
              ? t("preview.subWithTitle", { title: order.book.title })
              : t("preview.sub")}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-1.5 text-xs text-gold">
            <QrCode className="size-3.5" /> {t("preview.qrBadge")}
          </p>
        </header>

        {isDemo && (
          <div className="mb-8 flex flex-col items-center gap-4 rounded-3xl border border-gold/30 bg-surface p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-cream/80">
              <span className="font-display text-cream">{t("preview.demoBanner")}</span>{" "}
              {t("preview.demoBannerSub")}
            </p>
            <Button asChild className="shrink-0 rounded-full glow-gold">
              <Link to="/bestellen">{t("preview.demoCta")}</Link>
            </Button>
          </div>
        )}

        <div className="mt-12">
          {loading || !order.book ? (
            <div className="mx-auto w-full max-w-5xl space-y-4">
              <Skeleton className="aspect-[16/9] w-full rounded-[28px]" />
              <Skeleton className="h-6 w-3/4 rounded-full" />
              <Skeleton className="h-6 w-1/2 rounded-full" />
            </div>
          ) : (
            <SpreadViewer
              spreads={order.book.spreads}
              voiceName={order.familyVoiceName}
              voiceSkipped={order.voiceSkipped}
              onUpdate={onUpdateSpread}
            />
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-display text-lg text-cream">{formatEuro(BOOK_PRICE)}</p>
            <p className="text-xs text-muted-foreground">{t("preview.priceNote")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/bestellen"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-cream sm:block"
            >
              {t("preview.backToWizard")}
            </Link>
            <Button
              className="h-12 rounded-full px-6 glow-gold"
              onClick={() => navigate({ to: "/afrekenen" })}
            >
              {t("preview.orderCta")} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
