"use client";

import { cn } from "@/lib/utils";

export interface Preset {
  key: string;
  label: string;
}

/** Grade de períodos pré-definidos (diálogo de importação). */
export function PresetGrid({
  presets,
  active,
  onSelect,
}: {
  presets: Preset[];
  active: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => onSelect(p.key)}
          className={cn(
            "rounded-md border px-2.5 py-2 text-left text-xs font-semibold transition-colors",
            active === p.key
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-card text-muted-foreground hover:border-faint hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
