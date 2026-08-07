import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrivacyBadge({
  children,
  className,
  tone = "gold",
}: {
  children: ReactNode;
  className?: string;
  tone?: "gold" | "rose";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed",
        tone === "gold"
          ? "border-gold/35 bg-gold/10 text-cream/90"
          : "border-rose/35 bg-rose/10 text-cream/90",
        className,
      )}
    >
      <ShieldCheck className={cn("mt-0.5 size-5 shrink-0", tone === "gold" ? "text-gold" : "text-rose-soft")} />
      <p>{children}</p>
    </div>
  );
}
