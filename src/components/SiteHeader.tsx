import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
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
            Voorbeeld
          </Link>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/bestellen">Maak jullie boek</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
