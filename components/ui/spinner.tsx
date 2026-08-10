import { cn } from "@/lib/utils";

/** Loader on-brand: 3 barrinhas pulsando (eco da logo H_Log). Usa currentColor. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-center gap-[2px]", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-center rounded-full bg-current animate-bars"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
