import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Upload, Check, ArrowLeft, ArrowRight, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { StyleCard } from "@/components/StyleCard";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { MagicalLoader } from "@/components/MagicalLoader";
import { AGE_BRACKETS, ILLUSTRATION_STYLES, useOrder } from "@/lib/order-store";
import { STYLE_IMAGES, generateBook } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bestellen")({
  head: () => ({
    meta: [
      { title: "Bestellen — maak jullie persoonlijke sprookjesboek | KidStory AI" },
      {
        name: "description",
        content:
          "Stel in vijf stappen jullie boek samen: naam en leeftijd, foto, jullie verhaal, illustratiestijl en de familiestem voor de QR-code.",
      },
      { property: "og:title", content: "Bestellen — KidStory AI" },
      {
        property: "og:description",
        content: "In vijf stappen van jullie herinnering naar een persoonlijk sprookjesboek.",
      },
    ],
  }),
  component: OrderWizard,
});

const STEP_TITLES = [
  "Over je kind",
  "Foto uploaden",
  "Jullie verhaal",
  "Kies een stijl",
  "Familiestem voor de QR-code",
];

function OrderWizard() {
  const { order, update } = useOrder();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canContinue = [
    order.childName.trim().length > 1 && order.ageBracket !== null,
    Boolean(order.photoDataUrl) && order.guardianConsent,
    order.storyMode === "record" ? order.storyRecordingSeconds >= 120 : order.storyText.trim().length > 40,
    order.styleId !== null || order.customStyle.trim().length > 3,
    order.familyVoiceSeconds > 0 && order.voiceConsent && order.familyVoiceName.trim().length > 1,
  ][step];

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ photoDataUrl: String(reader.result), photoName: file.name });
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setLoading(true);
    const book = await generateBook(order);
    setTimeout(() => {
      update({ book });
      setLoading(false);
      navigate({ to: "/voorbeeld" });
    }, 3600);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <MagicalLoader visible={loading} />

      <main className="mx-auto max-w-3xl px-5 py-12">
        {/* Progress */}
        <ol className="flex items-center gap-2">
          {STEP_TITLES.map((title, i) => (
            <li key={title} className="flex flex-1 flex-col gap-2">
              <span
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i < step ? "bg-gold" : i === step ? "bg-gold/70" : "bg-cream/15",
                )}
              />
              <span
                className={cn(
                  "hidden text-[11px] sm:block",
                  i === step ? "text-gold" : "text-muted-foreground",
                )}
              >
                {title}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-muted-foreground">
          Stap {step + 1} van {STEP_TITLES.length}
        </p>
        <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">{STEP_TITLES[step]}</h1>

        <div className="mt-8 animate-reveal" key={step}>
          {step === 0 ? (
            <div className="space-y-8">
              <div>
                <Label htmlFor="childName" className="text-cream">
                  Voornaam van je kind
                </Label>
                <Input
                  id="childName"
                  value={order.childName}
                  onChange={(e) => update({ childName: e.target.value })}
                  placeholder="Bijv. Fenna"
                  className="mt-2 h-12 rounded-2xl bg-surface"
                />
              </div>
              <div>
                <p className="text-cream">Hoe oud is je kind?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  De taal, zinslengte en complexiteit van het verhaal passen we aan op de leeftijd.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {AGE_BRACKETS.map((bracket) => (
                    <button
                      key={bracket.id}
                      type="button"
                      onClick={() => update({ ageBracket: bracket.id })}
                      className={cn(
                        "card-lift rounded-2xl border border-border bg-surface p-4 text-left",
                        order.ageBracket === bracket.id && "border-gold glow-gold",
                      )}
                    >
                      <span className="font-display text-lg text-cream">{bracket.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{bracket.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gold/35 bg-surface/60 p-10 text-center transition-colors hover:border-gold/70"
              >
                {order.photoDataUrl ? (
                  <>
                    <img
                      src={order.photoDataUrl}
                      alt="Voorbeeld van de geüploade foto"
                      className="size-40 rounded-2xl object-cover shadow-soft"
                    />
                    <p className="mt-4 text-sm text-cream/80">{order.photoName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Klik om een andere foto te kiezen</p>
                  </>
                ) : (
                  <>
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                      <Upload className="size-6" />
                    </span>
                    <p className="mt-4 font-display text-lg text-cream">Sleep hier een foto naartoe</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Of klik om te kiezen — één duidelijke foto van het gezicht is genoeg (JPG of PNG).
                    </p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              <PrivacyBadge>
                Deze foto wordt direct na het genereren van de illustraties verwijderd. Je ontvangt
                hiervan een bevestiging per e-mail.
              </PrivacyBadge>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                <Checkbox
                  checked={order.guardianConsent}
                  onCheckedChange={(v) => update({ guardianConsent: v === true })}
                  className="mt-0.5"
                />
                <span className="text-sm text-cream/85">
                  Ik ben de ouder of wettelijke verzorger van dit kind en geef toestemming om deze foto
                  te verwerken voor het maken van de illustraties.
                </span>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <Tabs
              value={order.storyMode}
              onValueChange={(v) => update({ storyMode: v as "record" | "type" })}
            >
              <TabsList className="rounded-full bg-surface p-1">
                <TabsTrigger value="record" className="rounded-full px-5">
                  Inspreken
                </TabsTrigger>
                <TabsTrigger value="type" className="rounded-full px-5">
                  Typen
                </TabsTrigger>
              </TabsList>

              <TabsContent value="record" className="mt-6 space-y-4">
                <VoiceRecorder
                  seconds={order.storyRecordingSeconds}
                  onChange={(s) => update({ storyRecordingSeconds: s })}
                  label="Vertel jullie herinnering"
                  hint="Vertel gewoon alsof je het aan een vriend vertelt — 2 tot 5 minuten."
                />
                <PrivacyBadge tone="rose">
                  Jouw stem wordt ook de voorleesstem in het boek — één opname, twee cadeaus.
                </PrivacyBadge>
              </TabsContent>

              <TabsContent value="type" className="mt-6">
                <Textarea
                  rows={12}
                  value={order.storyText}
                  onChange={(e) => update({ storyText: e.target.value })}
                  placeholder={
                    "Wat gebeurde er precies?\nWie waren erbij?\nWat maakte het zo bijzonder?\nHoe liep het af?"
                  }
                  className="rounded-3xl bg-surface p-6 text-base leading-relaxed"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Beantwoord de vier vragen hierboven in je eigen woorden. Details maken het verhaal echt.
                </p>
              </TabsContent>
            </Tabs>
          ) : null}

          {step === 3 ? (
            <div className="space-y-8">
              <div className="grid gap-5 sm:grid-cols-2">
                {ILLUSTRATION_STYLES.map((style) => (
                  <StyleCard
                    key={style.id}
                    name={style.name}
                    description={style.description}
                    image={STYLE_IMAGES[style.id]}
                    selected={order.styleId === style.id}
                    onSelect={() => update({ styleId: style.id })}
                  />
                ))}
              </div>
              <div>
                <Label htmlFor="customStyle" className="flex items-center gap-2 text-cream">
                  <ImageIcon className="size-4 text-gold" /> Of beschrijf je eigen stijl
                </Label>
                <Input
                  id="customStyle"
                  value={order.customStyle}
                  onChange={(e) => update({ customStyle: e.target.value })}
                  placeholder="Bijv. zachte pastelkleuren met veel sterren en een oud-Hollandse sfeer"
                  className="mt-2 h-12 rounded-2xl bg-surface"
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Kies één familielid wiens stem straks in het gedrukte boek te horen is. Wij plaatsen
                kleine gouden QR-codes bij de mooiste passages — scannen met een telefoon en de stem
                klinkt.
              </p>
              <div>
                <Label htmlFor="voiceName" className="text-cream">
                  Van wie is deze stem?
                </Label>
                <Input
                  id="voiceName"
                  value={order.familyVoiceName}
                  onChange={(e) => update({ familyVoiceName: e.target.value })}
                  placeholder="Bijv. opa Jan"
                  className="mt-2 h-12 rounded-2xl bg-surface"
                />
              </div>
              <VoiceRecorder
                minSeconds={30}
                maxSeconds={120}
                seconds={order.familyVoiceSeconds}
                onChange={(s) => update({ familyVoiceSeconds: s })}
                label="Neem de familiestem op"
                hint="Een halve minuut voorlezen is al genoeg voor een prachtig resultaat."
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rose/30 bg-rose/10 p-4">
                <Checkbox
                  checked={order.voiceConsent}
                  onCheckedChange={(v) => update({ voiceConsent: v === true })}
                  className="mt-0.5"
                />
                <span className="text-sm text-cream/85">
                  Ik bevestig dat dit mijn eigen stem is en geef toestemming voor het klonen ervan. De
                  originele opname wordt na verwerking verwijderd.
                </span>
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-12 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="size-4" /> Terug
          </Button>

          {step < 4 ? (
            <Button
              className="h-12 rounded-full px-7"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Volgende <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              className="h-12 rounded-full px-7 glow-gold"
              disabled={!canContinue}
              onClick={handleGenerate}
            >
              <Sparkles className="size-4" /> Genereer voorbeeld
            </Button>
          )}
        </div>

        {!canContinue ? (
          <p className="mt-4 text-right text-xs text-muted-foreground">
            Vul deze stap eerst volledig in om verder te gaan.
          </p>
        ) : (
          <p className="mt-4 flex items-center justify-end gap-2 text-xs text-gold">
            <Check className="size-3.5" /> Klaar voor de volgende stap
          </p>
        )}
      </main>
    </div>
  );
}
