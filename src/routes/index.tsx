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
          "Een persoonlijk hardcover sprookjesboek met AI-illustraties van je kind en familiestemmen via QR-codes.",
      },
    ],
  }),
  component: LandingPage,
});

const STEPS = [
  {
    icon: Mic,
    title: "Vertel jullie verhaal",
    text: "Spreek 2 tot 5 minuten in — of typ het gewoon. Eén echte herinnering is genoeg.",
  },
  {
    icon: Wand2,
    title: "AI maakt het sprookje",
    text: "Wij maken er een geïllustreerd sprookje van, met het gezicht van je kind in de stijl die jullie kiezen.",
  },
  {
    icon: QrCode,
    title: "Scan & luister",
    text: "QR-codes in het gedrukte boek spelen de stemmen van de familie af — voor altijd.",
  },
];

const FAQ = [
  {
    q: "Hoe lang duurt het voordat het boek klaar is?",
    a: "Het voorbeeld staat binnen enkele minuten online. Na jouw goedkeuring drukken en versturen we het boek in 4–6 werkdagen.",
  },
  {
    q: "Wat gebeurt er met de foto van mijn kind?",
    a: "De foto wordt uitsluitend gebruikt om de illustraties te maken en direct daarna verwijderd. Je krijgt daarvan een bevestiging per e-mail.",
  },
  {
    q: "Hoe werkt de stem in de QR-code?",
    a: "In het gedrukte boek staan kleine gouden QR-codes. Scan je die met een telefoon, dan hoor je de opgenomen stem van bijvoorbeeld opa dat stukje voorlezen.",
  },
  {
    q: "Is het echt het gezicht van mijn kind?",
    a: "Ja. De illustraties worden gemaakt op basis van één foto, zodat je kind herkenbaar de held van het verhaal is — in de gekozen tekenstijl.",
  },
  {
    q: "Kan ik het boek nog aanpassen?",
    a: "Zeker. In het voorbeeld pas je elke tekst aan en genereer je illustraties opnieuw tot ze precies goed voelen.",
  },
  {
    q: "Wat is de levertijd binnen Nederland?",
    a: "4 tot 6 werkdagen, met gratis verzending. Bestel vóór 20 november om zeker op tijd te zijn voor Sinterklaas.",
  },
  {
    q: "Wordt onze data gebruikt om AI te trainen?",
    a: "Nooit. Foto's, stemmen en verhalen worden niet gebruikt voor het trainen van modellen.",
  },
  {
    q: "Krijg ik ook een digitale versie?",
    a: "Ja, de PDF-versie van het boek zit bij de prijs inbegrepen en komt naar je inbox.",
  },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function LandingPage() {
  const year = new Date().getMonth() > 10 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const countdown = useCountdown(new Date(`${year}-11-20T23:59:59`));

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="night-sky starfield relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-28">
          <div className="animate-reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs text-gold">
              <Sparkles className="size-3.5" /> Persoonlijke sprookjesboeken uit Nederland
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.1] text-cream sm:text-5xl lg:text-6xl">
              Jouw kind, de held van een <span className="text-gradient-gold">echt familieverhaal</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Vertel ons één echte herinnering. Wij maken er een magisch, geïllustreerd boek van — met
              het gezicht van je kind in elke tekening en de stemmen van jullie familie, hoorbaar via
              QR-codes in het gedrukte boek.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="h-13 rounded-full px-8 text-base glow-gold">
                <Link to="/bestellen">Maak jullie boek</Link>
              </Button>
              <Link
                to="/voorbeeld"
                className="text-sm text-cream/80 underline decoration-gold/50 underline-offset-8 transition-colors hover:text-gold"
              >
                Bekijk een voorbeeld
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute inset-8 rounded-full bg-gold/20 blur-3xl" />
            <img
              src={heroBook}
              alt="Hardcover sprookjesboek met gloeiende gouden QR-code op de kaft"
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
            Op tijd voor Sinterklaas 🎁 — bestel vóór 20 november
          </p>
          <div className="flex gap-2 font-mono text-sm text-gold">
            {[
              [countdown.days, "d"],
              [countdown.hours, "u"],
              [countdown.minutes, "m"],
              [countdown.seconds, "s"],
            ].map(([value, unit]) => (
              <span key={unit as string} className="rounded-xl bg-background/50 px-3 py-1.5">
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
          <h2 className="text-center font-display text-3xl text-cream sm:text-4xl">Hoe het werkt</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            In drie stappen van een herinnering naar een boek dat generaties meegaat.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120}>
              <div className="card-lift h-full rounded-3xl border border-border bg-surface p-8">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-6 font-display text-xl text-cream">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Emotionele kern */}
      <section className="relative overflow-hidden border-y border-rose/20 bg-rose/5">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <Reveal>
            <span className="text-sm uppercase tracking-[0.2em] text-rose-soft">Het hart van KidStory</span>
            <h2 className="mt-5 font-display text-3xl leading-tight text-cream sm:text-4xl">
              De stem van opa en oma — voor altijd bewaard
            </h2>
            <p className="mt-6 leading-relaxed text-cream/80">
              Een stem vergeet je sneller dan je denkt. Daarom nemen we hem nú op. Opa leest een stukje
              van het verhaal voor, wij verwerken het in een QR-code die in het gedrukte boek staat.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Over tien, twintig of veertig jaar scant je kind diezelfde bladzijde — en hoort opnieuw
              precies dezelfde warme stem. Dat is geen extraatje: dat is waarom we dit maken.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose/30 bg-background/40 p-4 glow-rose">
              <QrCode className="size-6 shrink-0 text-rose-soft" />
              <p className="text-sm text-cream/85">
                «Hier klinkt de stem van opa» — precies daar waar het verhaal om hem gaat.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <img
              src={grandparent}
              alt="Opa leest zijn kleinkind voor uit een gloeiend sprookjesboek"
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
            Kies jullie illustratiestijl
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Vier handgekozen stijlen — of beschrijf tijdens het bestellen je eigen droomstijl.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ILLUSTRATION_STYLES.map((style, i) => (
            <Reveal key={style.id} delay={i * 100}>
              <StyleCard
                name={style.name}
                description={style.description}
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
              Wij bewaren geen gegevens van je kind.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Vertrouwen is de basis van dit product. Daarom is onze omgang met jullie gegevens zo
              streng mogelijk — en volledig controleerbaar.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Trash2,
                  title: "Foto direct verwijderd",
                  text: "Meteen na het genereren van de illustraties wissen we de foto. Je krijgt een bevestiging per e-mail.",
                },
                {
                  icon: Mic,
                  title: "Stemopname gewist",
                  text: "De originele opname wordt verwijderd zodra het verhaal en de voorleesstem verwerkt zijn.",
                },
                {
                  icon: BrainCircuit,
                  title: "Geen AI-training",
                  text: "Jullie foto's, stemmen en verhalen worden nooit gebruikt om AI-modellen te trainen.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-background/40 p-6">
                  <item.icon className="size-5 text-gold" />
                  <h3 className="mt-4 font-display text-lg text-cream">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Prijs */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-[32px] border border-gold/40 bg-surface p-8 text-center shadow-soft glow-gold sm:p-12">
            <BookOpen className="mx-auto size-8 text-gold" />
            <h2 className="mt-6 font-display text-3xl text-cream">Eén boek — {formatEuro(BOOK_PRICE)}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Alles inbegrepen. Geen abonnement, geen verrassingen.
            </p>
            <ul className="mt-8 space-y-3 text-left">
              {[
                "Hardcover, 24–32 pagina's",
                "AI-illustraties met het gezicht van je kind",
                "Keuze uit vier illustratiestijlen",
                "1 QR-code met een familiestem",
                "Voorbeeld bekijken en aanpassen vóór het drukken",
                "PDF-versie inbegrepen",
                "Gratis levering in Nederland",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-cream/85">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-9 h-13 w-full rounded-full text-base">
              <Link to="/bestellen">Bestel nu</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl text-cream sm:text-4xl">
            Veelgestelde vragen
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {FAQ.map((item) => (
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
