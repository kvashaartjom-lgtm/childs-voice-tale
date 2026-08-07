import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/api";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-gold" />
            <span className="font-display text-lg text-cream">KidStory AI</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Echte familieverhalen, prachtig geïllustreerd — met de stemmen die je nooit wilt vergeten.
          </p>
          <div className="mt-6 flex gap-5 text-sm text-muted-foreground">
            <Link to="/privacybeleid" className="transition-colors hover:text-gold">
              Privacybeleid
            </Link>
            <Link to="/voorwaarden" className="transition-colors hover:text-gold">
              Voorwaarden
            </Link>
          </div>
        </div>

        <div className="md:justify-self-end md:text-right">
          <h2 className="font-display text-xl text-cream">Blijf op de hoogte</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ontvang een bericht bij nieuwe stijlen en acties.
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row md:justify-end"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email) return;
              setState("loading");
              await joinWaitlist(email);
              setState("done");
              setEmail("");
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@email.nl"
              className="h-11 rounded-full bg-background/60 sm:w-64"
            />
            <Button type="submit" className="h-11 rounded-full" disabled={state === "loading"}>
              {state === "loading" ? "Bezig…" : "Aanmelden"}
            </Button>
          </form>
          {state === "done" ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-gold md:justify-end">
              <Check className="size-4" /> Je staat op de lijst. Tot snel!
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KidStory AI — Gemaakt in Nederland
      </div>
    </footer>
  );
}
