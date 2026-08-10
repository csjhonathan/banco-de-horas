import { cn } from "@/lib/utils";

/** Ícone da marca: chip de terminal escuro com barras de "log" neon. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" fill="#0d0f14" stroke="#232838" strokeWidth="1.5" />
      <rect x="7" y="9" width="14" height="3" rx="1.5" fill="#00ff88" />
      <rect x="7" y="15" width="9" height="3" rx="1.5" fill="#00ff88" opacity="0.75" />
      <rect x="7" y="21" width="12" height="3" rx="1.5" fill="#00ff88" opacity="0.5" />
    </svg>
  );
}

/** Wordmark H_Log em mono, adaptável ao tema (H em verde da marca). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono font-bold tracking-tight", className)}>
      <span className="text-brand">H</span>
      <span className="text-muted-foreground/50">_</span>
      <span className="text-foreground">Log</span>
    </span>
  );
}

/** Logo horizontal (chip + wordmark) para o header. */
export function Logo({ markSize = 30, className }: { markSize?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      <Wordmark className="text-base" />
    </div>
  );
}
