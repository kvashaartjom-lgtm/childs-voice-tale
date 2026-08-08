import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Sparkles, QrCode, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { illustrationVariants, regenerateIllustration, type BookSpread } from "@/lib/api";

interface SpreadViewerProps {
  spreads: BookSpread[];
  voiceName: string;
  onUpdate: (spreadId: string, patch: Partial<BookSpread>) => void;
}

export function SpreadViewer({ spreads, voiceName, onUpdate }: SpreadViewerProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [variantOpen, setVariantOpen] = useState(false);
  const [pendingVariant, setPendingVariant] = useState<string | null>(null);

  const spread = spreads[index];
  if (!spread) return null;

  const go = (dir: -1 | 1) => {
    setEditing(false);
    setIndex((i) => Math.min(spreads.length - 1, Math.max(0, i + dir)));
  };

  const applyVariant = async (url: string) => {
    setPendingVariant(url);
    const result = await regenerateIllustration(spread.id, url);
    onUpdate(result.spreadId, { imageUrl: result.imageUrl });
    setPendingVariant(null);
    setVariantOpen(false);
  };

  const qrName = voiceName?.trim() || t("spreadViewer.qrDefaultName");

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-soft">
          <div className="relative aspect-[4/3] sm:aspect-[16/9]">
            <img
              src={spread.imageUrl}
              alt={`Illustratie ${spread.pageLabel}`}
              loading="lazy"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            {spread.hasQrCode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-gold/50 bg-background/80 px-3 py-2 text-xs text-gold backdrop-blur animate-pulse-glow">
                    <QrCode className="size-4" />
                    QR
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {t("spreadViewer.qrTooltip", { name: qrName })}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <span className="absolute left-4 top-4 rounded-full bg-background/70 px-3 py-1 text-xs text-cream/80 backdrop-blur">
              {spread.pageLabel}
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {editing ? (
              <div className="space-y-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className="rounded-2xl bg-background/60 font-display text-lg leading-relaxed"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      onUpdate(spread.id, { text: draft });
                      setEditing(false);
                    }}
                  >
                    <Check className="size-4" /> {t("spreadViewer.save")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setEditing(false)}
                  >
                    {t("spreadViewer.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-display text-lg leading-relaxed text-cream sm:text-xl">
                {spread.text}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setDraft(spread.text);
                  setEditing(true);
                }}
              >
                <Pencil className="size-4" /> {t("spreadViewer.editText")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setVariantOpen(true)}
              >
                <Sparkles className="size-4" /> {t("spreadViewer.regenerate")}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={t("spreadViewer.prevSpread")}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {spreads.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={t("spreadViewer.goToSpread", { label: s.pageLabel })}
                onClick={() => {
                  setEditing(false);
                  setIndex(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-8 bg-gold" : "w-2 bg-cream/25 hover:bg-cream/50",
                )}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={() => go(1)}
            disabled={index === spreads.length - 1}
            aria-label={t("spreadViewer.nextSpread")}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <Dialog open={variantOpen} onOpenChange={setVariantOpen}>
          <DialogContent className="max-w-3xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{t("spreadViewer.dialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("spreadViewer.dialogSub", { label: spread.pageLabel.toLowerCase() })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              {illustrationVariants(index).map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => applyVariant(url)}
                  className="card-lift relative overflow-hidden rounded-2xl border border-border"
                >
                  <img
                    src={url}
                    alt={t("spreadViewer.variantAlt", { n: i + 1 })}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {pendingVariant === url ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="size-6 animate-spin text-gold" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
