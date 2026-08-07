import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QrCode, ArrowRight } from "lucide-react";
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
  const { order, update } = useOrder();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!order.book);

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
        <header className="text-center">
          <h1 className="font-display text-3xl text-cream sm:text-4xl">
            Jullie boek is klaar om te bekijken ✨
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {order.book?.title ? `«${order.book.title}» — ` : ""}
            blader door de pagina's, pas teksten aan en genereer illustraties opnieuw tot alles klopt.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-1.5 text-xs text-gold">
            <QrCode className="size-3.5" /> De gouden QR-badges tonen waar de familiestem klinkt
          </p>
        </header>

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
              onUpdate={onUpdateSpread}
            />
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-display text-lg text-cream">{formatEuro(BOOK_PRICE)}</p>
            <p className="text-xs text-muted-foreground">Incl. btw en gratis verzending in NL</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/bestellen"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-cream sm:block"
            >
              Terug naar de wizard
            </Link>
            <Button
              className="h-12 rounded-full px-6 glow-gold"
              onClick={() => navigate({ to: "/afrekenen" })}
            >
              Alles goed? Naar bestellen <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
