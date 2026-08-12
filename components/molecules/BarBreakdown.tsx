"use client";

import { useState } from "react";
import type { BreakdownSlice } from "@/types";
import { toHMS } from "@/lib/horas";
import { sliceColor } from "@/lib/chartColors";
import { Button } from "@/components/ui/button";

/**
 * Gráfico de barras horizontais ranqueado (magnitude por projeto/cliente/tarefa).
 * Rótulo na coluna à esquerda; a BARRA é a marca dominante, ancorada na base e
 * proporcional ao topo; valor + % ao fim. Barras de projeto usam a cor do
 * Clockify; as demais, o slot categórico. Rótulo direto → cor nunca é o único
 * canal. Top N com "ver todas".
 */
export function BarBreakdown({
  items,
  total,
  topN = 12,
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
  const max = items[0]?.seconds || 1; // ordenado desc → topo é o máximo
  const shown = expanded ? items : items.slice(0, topN);
  const hidden = items.length - shown.length;

  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((it, i) => {
        const share = total > 0 ? (it.seconds / total) * 100 : 0;
        const barPct = Math.max(1.5, (it.seconds / max) * 100);
        return (
          <div
            key={it.id}
            title={`${it.name} — ${toHMS(it.seconds)} (${share.toFixed(1)}%)`}
            className="animate-rise grid grid-cols-[minmax(6rem,11rem)_1fr_auto] items-center gap-3"
            style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
          >
            {/* rótulo */}
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-medium">{it.name}</span>
              {(it.project || it.client) && (
                <span className="truncate text-[11px] text-faint">{it.project || it.client}</span>
              )}
            </div>
            {/* barra */}
            <div className="h-4 w-full">
              <div
                className="h-full min-w-[3px] rounded-r-md rounded-l-sm transition-[width] duration-700 ease-out hover:brightness-110"
                style={{ width: `${barPct}%`, background: sliceColor(it, i) }}
              />
            </div>
            {/* valor */}
            <div className="shrink-0 text-right">
              <span className="num text-[13px] tabular-nums">{toHMS(it.seconds)}</span>
              <span className="num ml-1.5 text-xs text-faint">{share.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
      {hidden > 0 && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="mt-1 self-start text-xs text-muted-foreground"
        >
          ver todas (+{hidden})
        </Button>
      )}
    </div>
  );
}
