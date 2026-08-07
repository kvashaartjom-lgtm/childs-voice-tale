import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Loader2, Truck, Trash2, Mail, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useOrder, ILLUSTRATION_STYLES } from "@/lib/order-store";
import { BOOK_PRICE, formatEuro, createOrder, type CreatedOrder } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/afrekenen")({
  head: () => ({
    meta: [
      { title: "Afrekenen — bestel jullie sprookjesboek | KidStory AI" },
      {
        name: "description",
        content:
          "Rond je bestelling af met iDEAL of creditcard. €34,99 inclusief gratis verzending in Nederland en de PDF-versie.",
      },
      { property: "og:title", content: "Afrekenen — KidStory AI" },
      {
        property: "og:description",
        content: "Betaal veilig met iDEAL. Gratis verzending in Nederland, levering in 4–6 werkdagen.",
      },
    ],
  }),
  component: CheckoutPage,
});

const BANKS = ["ABN AMRO", "ASN Bank", "bunq", "ING", "Knab", "Rabobank", "Revolut", "SNS", "Triodos"];

function CheckoutPage() {
  const { order, update } = useOrder();
  const [method, setMethod] = useState<"ideal" | "card">("ideal");
  const [bank, setBank] = useState("");
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState<CreatedOrder | null>(null);

  const style = ILLUSTRATION_STYLES.find((s) => s.id === order.styleId);
  const shipping = order.shipping;
  const formValid =
    shipping.name.trim() &&
    shipping.street.trim() &&
    shipping.postalCode.trim() &&
    shipping.city.trim() &&
    shipping.email.trim() &&
    (method === "card" || bank);

  const pay = async () => {
    setProcessing(true);
    const result = await createOrder(order);
    setConfirmed(result);
    setProcessing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (confirmed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="night-sky mx-auto max-w-2xl px-5 py-20 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold/15 text-gold glow-gold">
            <Check className="size-8" />
          </span>
          <h1 className="mt-8 font-display text-3xl text-cream sm:text-4xl">
            Bedankt! Jullie boek wordt gemaakt ✨
          </h1>
          <p className="mt-4 text-muted-foreground">
            Bestelnummer <span className="text-cream">{confirmed.id}</span> — betaald{" "}
            {formatEuro(confirmed.total)}
          </p>

          <div className="mt-10 space-y-4 text-left">
            <div className="rounded-3xl border border-gold/35 bg-gold/10 p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Trash2 className="mt-0.5 size-5 shrink-0 text-gold" />
                De foto van je kind wordt nu verwijderd. Je ontvangt binnen enkele minuten een
                bevestiging per e-mail. ✓
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Truck className="mt-0.5 size-5 shrink-0 text-gold" />
                Verwachte levering: <span className="text-gold">{confirmed.estimatedDelivery}</span>
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Mail className="mt-0.5 size-5 shrink-0 text-gold" />
                De PDF-versie komt naar je inbox, zodat je het verhaal meteen kunt voorlezen.
              </p>
            </div>
            <div className="rounded-3xl border border-rose/30 bg-rose/10 p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <QrCode className="mt-0.5 size-5 shrink-0 text-rose-soft" />
                De stem van {order.familyVoiceName.trim() || "de familie"} is verwerkt in de QR-codes.
                De originele opname is verwijderd.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="mt-10 rounded-full">
            <Link to="/">Terug naar home</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <div>
            <h1 className="font-display text-3xl text-cream sm:text-4xl">Afrekenen</h1>
            <p className="mt-3 text-muted-foreground">
              Nog één stap en jullie verhaal gaat naar de drukker.
            </p>
          </div>

          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl text-cream">Bezorgadres</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                id="name"
                label="Naam"
                value={shipping.name}
                onChange={(v) => update({ shipping: { ...shipping, name: v } })}
                className="sm:col-span-2"
              />
              <Field
                id="street"
                label="Straat + huisnummer"
                value={shipping.street}
                onChange={(v) => update({ shipping: { ...shipping, street: v } })}
                className="sm:col-span-2"
              />
              <Field
                id="postalCode"
                label="Postcode"
                placeholder="1012 AB"
                value={shipping.postalCode}
                onChange={(v) => update({ shipping: { ...shipping, postalCode: v } })}
              />
              <Field
                id="city"
                label="Plaats"
                value={shipping.city}
                onChange={(v) => update({ shipping: { ...shipping, city: v } })}
              />
              <Field
                id="email"
                label="E-mailadres"
                type="email"
                placeholder="jouw@email.nl"
                value={shipping.email}
                onChange={(v) => update({ shipping: { ...shipping, email: v } })}
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl text-cream">Betaalmethode</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("ideal")}
                className={cn(
                  "rounded-2xl border border-border bg-background/40 p-5 text-left transition-colors",
                  method === "ideal" && "border-gold glow-gold",
                )}
              >
                <span className="font-display text-lg text-cream">iDEAL</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Direct betalen via je eigen bank
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={cn(
                  "rounded-2xl border border-border bg-background/40 p-5 text-left transition-colors",
                  method === "card" && "border-gold glow-gold",
                )}
              >
                <span className="flex items-center gap-2 font-display text-lg text-cream">
                  <CreditCard className="size-4 text-gold" /> Creditcard
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">Visa of Mastercard</span>
              </button>
            </div>

            {method === "ideal" ? (
              <div className="mt-6">
                <Label className="text-cream">Kies je bank</Label>
                <Select value={bank} onValueChange={setBank}>
                  <SelectTrigger className="mt-2 h-12 w-full rounded-2xl bg-background/40">
                    <SelectValue placeholder="Selecteer je bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field id="cardNumber" label="Kaartnummer" placeholder="4242 4242 4242 4242" className="sm:col-span-2" />
                <Field id="expiry" label="Vervaldatum" placeholder="12/29" />
                <Field id="cvc" label="CVC" placeholder="123" />
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              Dit is een demo-omgeving. Er wordt geen echte betaling verwerkt.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border border-gold/30 bg-surface p-6 shadow-soft">
            <h2 className="font-display text-xl text-cream">Jullie bestelling</h2>
            <p className="mt-2 text-sm text-gold">
              {order.book?.title || "Jullie persoonlijke sprookjesboek"}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <SummaryRow label="Naam kind" value={order.childName || "—"} />
              <SummaryRow label="Illustratiestijl" value={style?.name || order.customStyle || "—"} />
              <SummaryRow label="Uitvoering" value="Hardcover, 24–32 pagina's" />
              <SummaryRow
                label="QR-familiestem"
                value={order.familyVoiceName.trim() ? `1 × ${order.familyVoiceName}` : "1 stem"}
              />
              <SummaryRow label="PDF-versie" value="Inbegrepen" />
            </ul>
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between text-cream">
                <span>Boek</span>
                <span>{formatEuro(BOOK_PRICE)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Verzending</span>
                <span className="text-gold">Gratis (4–6 werkdagen)</span>
              </div>
              <div className="mt-4 flex items-center justify-between font-display text-2xl text-cream">
                <span>Totaal</span>
                <span>{formatEuro(BOOK_PRICE)}</span>
              </div>
            </div>

            <Button
              className="mt-7 h-13 w-full rounded-full text-base glow-gold"
              disabled={!formValid || processing}
              onClick={pay}
            >
              {processing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Betaling verwerken…
                </>
              ) : (
                `Betaal ${formatEuro(BOOK_PRICE)}`
              )}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Gratis verzending in Nederland (4–6 werkdagen)
            </p>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4">
      <span>{label}</span>
      <span className="text-right text-cream/85">{value}</span>
    </li>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-cream">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 h-12 rounded-2xl bg-background/40"
      />
    </div>
  );
}
