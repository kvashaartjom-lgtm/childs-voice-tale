import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t, i18n } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <span className="font-display text-lg tracking-wide text-cream">KidStory AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/voorbeeld"
            className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-cream sm:block"
          >
            {t("nav.preview")}
          </Link>
          <div className="flex items-center gap-0.5 text-sm">
            <button
              type="button"
              onClick={() => i18n.changeLanguage("nl")}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                i18n.language === "nl" ? "text-cream" : "text-muted-foreground hover:text-cream",
              )}
            >
              NL
            </button>
            <span className="text-muted-foreground/40">|</span>
            <button
              type="button"
              onClick={() => i18n.changeLanguage("en")}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                i18n.language === "en" ? "text-cream" : "text-muted-foreground hover:text-cream",
              )}
            >
              EN
            </button>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/bestellen">{t("nav.makeBook")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
