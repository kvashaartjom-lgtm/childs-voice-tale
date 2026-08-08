import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MagicalLoader({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const messages = t("loader.messages", { returnObjects: true }) as string[];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % messages.length), 900);
    return () => clearInterval(id);
  }, [visible, messages.length]);

  if (!visible) return null;

  return (
    <div className="night-sky starfield fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/25 blur-3xl animate-pulse-glow" />
        <Sparkles className="relative size-16 text-gold animate-float" />
      </div>
      <h2 className="mt-10 font-display text-2xl text-cream sm:text-3xl">{messages[step]}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{t("loader.subtext")}</p>
      <div className="mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/3 animate-[float-slow_1.6s_ease-in-out_infinite] rounded-full bg-gold" />
      </div>
    </div>
  );
}
