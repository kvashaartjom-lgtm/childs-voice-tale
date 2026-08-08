import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Mic,
  Wand2,
  QrCode,
  ShieldCheck,
  Trash2,
  BrainCircuit,
  Check,
  Gift,
  BookOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StyleCard } from "@/components/StyleCard";
import { Reveal } from "@/components/Reveal";
import { ILLUSTRATION_STYLES } from "@/lib/order-store";
import { STYLE_IMAGES, BOOK_PRICE, formatEuro } from "@/lib/api";
import heroBook from "@/assets/hero-book.jpg";
import grandparent from "@/assets/grandparent.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KidStory AI — Jouw kind, de held van een echt familieverhaal" },
      {
        name: "description",
        content:
          "Van een echte familieherinnering naar een geïllustreerd sprookjesboek met het gezicht van je kind én de stem van opa via QR-code. €34,99, gratis verzending in NL.",
      },
      { property: "og:title", content: "KidStory AI — Jouw kind, de held van een echt familieverhaal" },
      {
        property: "og:description",
        content:
          "Van een echte familieherinnering naar een geïllustreerd sprookjesboek met het gezicht van je kind én de stem van opa via QR-code. €34,99, gratis verzending in NL.",
      },
    ],
  }),
  component: LandingPage,
});

const STEP_ICONS = [Mic, Wand2, QrCode];

const PRIVACY_ICONS = [Trash2, Mic, BrainCircuit];

function useCountdown(target: Date) {
  // Start from null so SSR and first client render match; tick after mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = now ? Math.max(0, target.getTime() - now.getTime()) : 0;
  return {
    ready: now !== null,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

// 2026-11-20 23:59:59 Europe/Amsterdam — CET is UTC+1 in November
const SINTERKLAAS_DEADLINE = new Date("2026-11-20T22:59:59Z");

function LandingPage() {
  const { t } = useTranslation();
  const countdown = useCountdown(SINTERKLAAS_DEADLINE);

  const steps = t("home.steps", { returnObjects: true }) as { title: string; text: string }[];
  const privacyItems = t("home.privacyItems", { returnObjects: true }) as {
    title: string;
    text: string;
  }[];
  const pricingItems = t("home.pricingItems", { returnObjects: true }) as string[];
  const faq = t("home.faq", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="night-sky starfield relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-28">
          <div className="animate-reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs text-gold">
              <Sparkles className="size-3.5" /> {t("home.heroBadge")}
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.1] text-cream sm:text-5xl lg:text-6xl">
              {t("home.heroTitle")}{" "}
              <span className="text-gradient-gold">{t("home.heroTitleHighlight")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("home.heroText")}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="h-13 rounded-full px-8 text-base glow-gold">
                <Link to="/bestellen">{t("home.heroCta")}</Link>
              </Button>
              <Link
                to="/voorbeeld"
                className="text-sm text-cream/80 underline decoration-gold/50 underline-offset-8 transition-colors hover:text-gold"
              >
                {t("home.heroExample")}
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute inset-8 rounded-full bg-gold/20 blur-3xl" />
            <img
              src={heroBook}
              alt={t("home.heroBookAlt")}
              width={1024}
              height={1024}
              className="animate-float relative w-full max-w-md rounded-[28px] border border-gold/20 shadow-soft"
            />
          </div>
        </div>
      </section>

      {/* Sinterklaas banner */}
      <section className="border-y border-gold/25 bg-gold/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-5 text-center sm:flex-row sm:text-left">
          <p className="flex items-center gap-3 font-display text-lg text-cream">
            <Gift className="size-5 text-gold" />
            {t("home.sinterklaas")}
          </p>
          <div
            className={`flex gap-2 font-mono text-sm text-gold transition-opacity ${countdown.ready ? "opacity-100" : "opacity-0"}`}
          >
            {[
              [countdown.days, t("home.countdownDays")],
              [countdown.hours, t("home.countdownHours")],
              [countdown.minutes, t("home.countdownMinutes")],
              [countdown.seconds, t("home.countdownSeconds")],
            ].map(([value, unit]) => (
              <span
                key={unit as string}
                className="rounded-xl bg-background/50 px-3 py-1.5 tabular-nums"
                suppressHydrationWarning
              >
                {String(value).padStart(2, "0")}
                {unit}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-cream sm:text-4xl">
            {t("home.howTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            {t("home.howSub")}
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i]!;
            return (
              <Reveal key={i} delay={i * 120}>
                <div className="card-lift h-full rounded-3xl border border-border bg-surface p-8">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-6 font-display text-xl text-cream">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Emotionele kern */}
      <section className="relative overflow-hidden border-y border-rose/20 bg-rose/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <Reveal>
            <span className="text-sm uppercase tracking-[0.2em] text-rose-soft">
              {t("home.voiceLabel")}
            </span>
            <h2 className="mt-5 font-display text-3xl leading-tight text-cream sm:text-4xl">
              {t("home.voiceTitle")}
            </h2>
            <p className="mt-6 leading-relaxed text-cream/80">{t("home.voiceText1")}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t("home.voiceText2")}</p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose/30 bg-background/40 p-4 glow-rose">
              <QrCode className="size-6 shrink-0 text-rose-soft" />
              <p className="text-sm text-cream/85">{t("home.voiceQuote")}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <img
              src={grandparent}
              alt={t("home.voiceAlt")}
              loading="lazy"
              width={1280}
              height={896}
              className="w-full rounded-[28px] border border-rose/20 shadow-soft"
            />
          </Reveal>
        </div>
      </section>

      {/* Stijlen */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-cream sm:text-4xl">
            {t("home.stylesTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            {t("home.stylesSub")}
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ILLUSTRATION_STYLES.map((style, i) => (
            <Reveal key={style.id} delay={i * 100}>
              <StyleCard
                name={t(`illustrationStyles.${style.id}.name`)}
                description={t(`illustrationStyles.${style.id}.description`)}
                image={STYLE_IMAGES[style.id]}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <Reveal>
          <div className="rounded-[32px] border border-gold/30 bg-surface p-8 shadow-soft sm:p-12">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold glow-gold">
              <ShieldCheck className="size-7" />
            </span>
            <h2 className="mt-6 font-display text-3xl text-cream sm:text-4xl">
              {t("home.privacyTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">{t("home.privacySub")}</p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {privacyItems.map((item, i) => {
                const Icon = PRIVACY_ICONS[i]!;
                return (
                  <div key={i} className="rounded-2xl border border-border bg-background/40 p-6">
                    <Icon className="size-5 text-gold" />
                    <h3 className="mt-4 font-display text-lg text-cream">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Prijs */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-[32px] border border-gold/40 bg-surface p-8 text-center shadow-soft glow-gold sm:p-12">
            <BookOpen className="mx-auto size-8 text-gold" />
            <h2 className="mt-6 font-display text-3xl text-cream">
              {t("home.pricingTitle", { price: formatEuro(BOOK_PRICE) })}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{t("home.pricingSub")}</p>
            <ul className="mt-8 space-y-3 text-left">
              {pricingItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-cream/85">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-9 h-13 w-full rounded-full text-base glow-gold">
              <Link to="/bestellen">{t("home.pricingCta")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-cream sm:text-4xl">
            {t("home.faqTitle")}
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {faq.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="border-border/70 border-b px-1"
              >
                <AccordionTrigger className="text-left font-display text-lg text-cream hover:text-gold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
