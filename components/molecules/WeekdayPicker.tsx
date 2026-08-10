"use client";

import { cn } from "@/lib/utils";

const LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Seletor dos dias da semana trabalhados (0=dom … 6=sáb). Mín. 1 dia. */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (dias: number[]) => void;
}) {
  function toggle(d: number) {
    const next = value.includes(d)
      ? value.filter((x) => x !== d)
      : [...value, d].sort((a, b) => a - b);
    if (next.length) onChange(next); // não deixa zerar
  }

  return (
    <div className="flex gap-1.5">
      {LABELS.map((label, d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            title={FULL[d]}
            onClick={() => toggle(d)}
            className={cn(
              "size-9 rounded-md border text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
