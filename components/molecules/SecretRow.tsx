"use client";

import { cn } from "@/lib/utils";

/** Linha de signing secret (rótulo + input + status configurada/não). */
export function SecretRow({
  label,
  value,
  onChange,
  configured,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  configured: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <span className="w-[74px] flex-none pt-2.5 text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="signing secret"
          className="num w-full rounded-md border border-border bg-card px-3 py-2 text-xs focus-visible:border-accent focus-visible:outline-none"
        />
        <small
          className={cn(
            "mt-0.5 block text-[10px] font-semibold",
            configured ? "text-credit" : "text-faint",
          )}
        >
          {configured ? "✓ configurada" : "não configurada"}
        </small>
      </div>
    </label>
  );
}
