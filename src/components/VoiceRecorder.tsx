import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Play, Pause, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  minSeconds?: number;
  maxSeconds?: number;
  seconds: number;
  onChange: (seconds: number) => void;
  label?: string;
  hint?: string;
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Mock recorder: no microphone access, purely simulated timing + waveform. */
export function VoiceRecorder({
  minSeconds = 120,
  maxSeconds = 300,
  seconds,
  onChange,
  label,
  hint,
}: VoiceRecorderProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRecording) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      onChange(Math.min(maxSeconds, secondsRef.current + 1));
    }, 250); // sped up so the prototype feels responsive
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isRecording, maxSeconds, onChange]);

  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  useEffect(() => {
    if (seconds >= maxSeconds) setIsRecording(false);
  }, [seconds, maxSeconds]);

  const hasRecording = !isRecording && seconds > 0;
  const enough = seconds >= minSeconds;

  const displayLabel = label ?? t("voiceRecorder.defaultLabel");

  return (
    <div className="rounded-3xl border border-border bg-surface/70 p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg text-cream">{displayLabel}</p>
          {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 font-mono text-sm",
            isRecording ? "bg-rose/20 text-rose-soft" : "bg-surface-2 text-muted-foreground",
          )}
        >
          {formatTime(seconds)} / {formatTime(maxSeconds)}
        </span>
      </div>

      <div className="mt-6 flex h-24 items-center justify-center gap-[3px] overflow-hidden rounded-2xl bg-background/60 px-4">
        {Array.from({ length: 56 }).map((_, i) => {
          const active = isRecording || isPlaying;
          const height = active
            ? 12 + Math.abs(Math.sin((i + seconds) * 0.6)) * 60
            : hasRecording
              ? 8 + Math.abs(Math.sin(i * 0.7)) * 42
              : 6;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-200",
                active ? "bg-gold" : hasRecording ? "bg-gold/50" : "bg-cream/15",
              )}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <Button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setIsRecording(true);
            }}
            className="rounded-full"
          >
            <Mic className="size-4" />
            {hasRecording ? t("voiceRecorder.resume") : t("voiceRecorder.start")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={() => setIsRecording(false)}
          >
            <Square className="size-4" />
            {t("voiceRecorder.stop")}
          </Button>
        )}

        {hasRecording ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setIsPlaying((p) => !p)}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              {isPlaying ? t("voiceRecorder.pause") : t("voiceRecorder.listen")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                onChange(0);
                setIsPlaying(false);
              }}
            >
              <RotateCcw className="size-4" />
              {t("voiceRecorder.reRecord")}
            </Button>
          </>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-4 flex items-center gap-2 text-sm",
          enough ? "text-gold" : "text-muted-foreground",
        )}
      >
        {enough ? <Check className="size-4" /> : null}
        {enough
          ? t("voiceRecorder.doneHint")
          : t("voiceRecorder.minHint", {
              min: Math.round(minSeconds / 60),
              max: Math.round(maxSeconds / 60),
            })}
      </p>
    </div>
  );
}
