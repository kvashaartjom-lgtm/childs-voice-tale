import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Loader2, Truck, Trash2, Mail, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    update({ photoDataUrl: null, photoName: null });
    setConfirmed(result);
    setProcessing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const styleName = style ? t(`illustrationStyles.${style.id}.name`) : order.customStyle || "—";

  if (confirmed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="night-sky mx-auto max-w-2xl px-5 py-20 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold/15 text-gold glow-gold">
            <Check className="size-8" />
          </span>
          <h1 className="mt-8 font-display text-3xl text-cream sm:text-4xl">
            {t("checkout.successTitle")}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {t("checkout.successOrderText", { id: confirmed.id, total: formatEuro(confirmed.total) })}
          </p>

          <div className="mt-10 space-y-4 text-left">
            <div className="rounded-3xl border border-gold/35 bg-gold/10 p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Trash2 className="mt-0.5 size-5 shrink-0 text-gold" />
                {t("checkout.successPhotoDeleted")}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Truck className="mt-0.5 size-5 shrink-0 text-gold" />
                {t("checkout.successDelivery")}{" "}
                <span className="text-gold">{confirmed.estimatedDelivery}</span>
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <Mail className="mt-0.5 size-5 shrink-0 text-gold" />
                {t("checkout.successPdf")}
              </p>
            </div>
            <div className="rounded-3xl border border-rose/30 bg-rose/10 p-6">
              <p className="flex items-start gap-3 text-cream/90">
                <QrCode className="mt-0.5 size-5 shrink-0 text-rose-soft" />
                {t("checkout.successVoice", {
                  name: order.familyVoiceName.trim() || t("spreadViewer.qrDefaultName"),
                })}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="mt-10 rounded-full">
            <Link to="/">{t("checkout.successBack")}</Link>
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
            <h1 className="font-display text-3xl text-cream sm:text-4xl">{t("checkout.title")}</h1>
            <p className="mt-3 text-muted-foreground">{t("checkout.sub")}</p>
          </div>

          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl text-cream">{t("checkout.addressTitle")}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                id="name"
                label={t("checkout.fieldName")}
                value={shipping.name}
                onChange={(v) => update({ shipping: { ...shipping, name: v } })}
                className="sm:col-span-2"
              />
              <Field
                id="street"
                label={t("checkout.fieldStreet")}
                value={shipping.street}
                onChange={(v) => update({ shipping: { ...shipping, street: v } })}
                className="sm:col-span-2"
              />
              <Field
                id="postalCode"
                label={t("checkout.fieldPostcode")}
                placeholder={t("checkout.fieldPostcodePlaceholder")}
                value={shipping.postalCode}
                onChange={(v) => update({ shipping: { ...shipping, postalCode: v } })}
              />
              <Field
                id="city"
                label={t("checkout.fieldCity")}
                value={shipping.city}
                onChange={(v) => update({ shipping: { ...shipping, city: v } })}
              />
              <Field
                id="email"
                label={t("checkout.fieldEmail")}
                type="email"
                placeholder={t("checkout.fieldEmailPlaceholder")}
                value={shipping.email}
                onChange={(v) => update({ shipping: { ...shipping, email: v } })}
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl text-cream">{t("checkout.paymentTitle")}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("ideal")}
                className={cn(
                  "rounded-2xl border border-border bg-background/40 p-5 text-left transition-colors",
                  method === "ideal" && "border-gold glow-gold",
                )}
              >
                <span className="font-display text-lg text-cream">{t("checkout.idealTitle")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("checkout.idealSub")}
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
                  <CreditCard className="size-4 text-gold" /> {t("checkout.cardTitle")}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("checkout.cardSub")}
                </span>
              </button>
            </div>

            {method === "ideal" ? (
              <div className="mt-6">
                <Label className="text-cream">{t("checkout.bankLabel")}</Label>
                <Select value={bank} onValueChange={setBank}>
                  <SelectTrigger className="mt-2 h-12 w-full rounded-2xl bg-background/40">
                    <SelectValue placeholder={t("checkout.bankPlaceholder")} />
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
                <Field
                  id="cardNumber"
                  label={t("checkout.cardNumber")}
                  placeholder={t("checkout.cardNumberPlaceholder")}
                  className="sm:col-span-2"
                />
                <Field
                  id="expiry"
                  label={t("checkout.cardExpiry")}
                  placeholder={t("checkout.cardExpiryPlaceholder")}
                />
                <Field
                  id="cvc"
                  label={t("checkout.cardCvc")}
                  placeholder={t("checkout.cardCvcPlaceholder")}
                />
              </div>
            )}

            <p className="mt-6 text-xs text-muted-foreground">{t("checkout.demoDisclaimer")}</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border border-gold/30 bg-surface p-6 shadow-soft">
            <h2 className="font-display text-xl text-cream">{t("checkout.orderSummaryTitle")}</h2>
            <p className="mt-2 text-sm text-gold">
              {order.book?.title || t("checkout.orderSummaryTitle")}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <SummaryRow label={t("checkout.summaryChildName")} value={order.childName || "—"} />
              <SummaryRow label={t("checkout.summaryStyle")} value={styleName} />
              <SummaryRow label={t("checkout.summaryFormat")} value={t("checkout.summaryFormatValue")} />
              <SummaryRow
                label={t("checkout.summaryVoice")}
                value={
                  order.familyVoiceName.trim()
                    ? t("checkout.summaryVoiceValue", { name: order.familyVoiceName })
                    : t("checkout.summaryVoiceDefault")
                }
              />
              <SummaryRow label={t("checkout.summaryPdf")} value={t("checkout.summaryPdfIncluded")} />
            </ul>
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between text-cream">
                <span>{t("checkout.summaryBook")}</span>
                <span>{formatEuro(BOOK_PRICE)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("checkout.summaryShipping")}</span>
                <span className="text-gold">{t("checkout.summaryShippingValue")}</span>
              </div>
              <div className="mt-4 flex items-center justify-between font-display text-2xl text-cream">
                <span>{t("checkout.summaryTotal")}</span>
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
                  <Loader2 className="size-4 animate-spin" /> {t("checkout.payButtonProcessing")}
                </>
              ) : (
                t("checkout.payButton", { price: formatEuro(BOOK_PRICE) })
              )}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("checkout.shippingNote")}
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
