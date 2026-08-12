"use client";

import { useState } from "react";
import type { BreakdownSlice } from "@/types";
import { toHMS } from "@/lib/horas";
import { sliceColor } from "@/lib/chartColors";
import { Button } from "@/components/ui/button";

/** Lista ranqueada (nº · cor · nome · duração · %) — leitura densa, sem barra. */
export function ListBreakdown({
  items,
  total,
  topN = 20,
  emptyLabel = "Nada no período.",
}: {
  items: BreakdownSlice[];
  total: number;
  topN?: number;
  emptyLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) {
    return <div className="py-8 text-center text-[13px] text-faint">{emptyLabel}</div>;
  }
  const shown = expanded ? items : items.slice(0, topN);
  const hidden = items.length - shown.length;

  return (
    <div className="flex flex-col">
      {shown.map((it, i) => {
        const share = total > 0 ? (it.seconds / total) * 100 : 0;
        return (
          <div
            key={it.id}
            className="animate-rise flex items-center gap-3 border-b py-2.5 text-sm last:border-b-0"
            style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}
          >
            <span className="num w-6 shrink-0 text-right text-xs text-faint">{i + 1}</span>
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: sliceColor(it, i) }}
            />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate font-medium">{it.name}</span>
              {it.project && <span className="truncate text-xs text-faint">· {it.project}</span>}
              {it.client && <span className="truncate text-xs text-faint">· {it.client}</span>}
            </span>
            <span className="num shrink-0 tabular-nums">{toHMS(it.seconds)}</span>
            <span className="num w-10 shrink-0 text-right text-xs text-faint">
              {share.toFixed(0)}%
            </span>
          </div>
        );
      })}
      {hidden > 0 && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="mt-2 self-start text-xs text-muted-foreground"
        >
          ver todas (+{hidden})
        </Button>
      )}
    </div>
  );
}
