import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StyleCardProps {
  name: string;
  description: string;
  image: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function StyleCard({ name, description, image, selected, onSelect }: StyleCardProps) {
  const interactive = Boolean(onSelect);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!interactive}
      className={cn(
        "card-lift group relative w-full overflow-hidden rounded-3xl border border-border bg-surface text-left shadow-soft",
        selected && "border-gold glow-gold",
        !interactive && "cursor-default",
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={`Illustratiestijl ${name}`}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
        {selected ? (
          <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-gold text-primary-foreground">
            <Check className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl text-cream">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
