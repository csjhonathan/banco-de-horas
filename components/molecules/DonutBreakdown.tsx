"use client";

import { useEffect, useState } from "react";
import type { BreakdownSlice } from "@/types";
import { toHMS } from "@/lib/horas";
import { OTHER_COLOR, sliceColor } from "@/lib/chartColors";

interface Arc {
  key: string;
  name: string;
  seconds: number;
  color: string;
  pct: number;
  offset: number;
}

/**
 * Donut do share por fatia. Top N + "Outros" (a cauda agregada), pois pizza com
 * muitas fatias vira ruído. Cada fatia é rotulada na legenda (nome + duração +
 * %), então a cor nunca é o único canal. Anima o desenho na montagem; hover
 * destaca a fatia e mostra o valor no centro.
 */
export function DonutBreakdown({
  items,
  total,
  topN = 8,
  emptyLabel = "Nada no período.",
}: {
  items: BreakdownSlice[];
  total: number;
  topN?: number;
  emptyLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!items.length || total <= 0) {
    return <div className="py-8 text-center text-[13px] text-faint">{emptyLabel}</div>;
  }

  const head = items.slice(0, topN);
  const tailSec = items.slice(topN).reduce((a, b) => a + b.seconds, 0);
  const base = head.map((it, i) => ({
    key: it.id,
    name: it.name,
    seconds: it.seconds,
    color: sliceColor(it, i),
  }));
  if (tailSec > 0) {
    base.push({
      key: "outros",
      name: `Outros (${items.length - topN})`,
      seconds: tailSec,
      color: OTHER_COLOR,
    });
  }

  let acc = 0;
  const arcs: Arc[] = base.map((s) => {
    const pct = (s.seconds / total) * 100;
    const offset = acc;
    acc += pct;
    return { ...s, pct, offset };
  });

  const r = 42;
  const c = 50;
  const sw = 13;
  const center = active != null ? arcs[active] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="size-44 -rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
          {arcs.map((a, i) => (
            <circle
              key={a.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={active === i ? sw + 3 : sw}
              pathLength={100}
              strokeDasharray={`${mounted ? a.pct : 0} ${100 - (mounted ? a.pct : 0)}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-700 ease-out"
              style={{
                transitionDelay: `${Math.min(i, 10) * 60}ms`,
                opacity: active == null || active === i ? 1 : 0.3,
              }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="animate-fade">
            <div className="num text-lg font-bold leading-none tabular-nums">
              {toHMS(center ? center.seconds : total)}
            </div>
            <div className="mx-auto mt-1 max-w-[6.5rem] truncate text-[11px] text-muted-foreground">
              {center ? center.name : "total"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {arcs.map((a, i) => (
          <button
            key={a.key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="animate-rise flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-muted/50"
            style={{
              animationDelay: `${Math.min(i, 10) * 40}ms`,
              opacity: active == null || active === i ? 1 : 0.5,
            }}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
            <span className="num shrink-0 tabular-nums">{toHMS(a.seconds)}</span>
            <span className="num w-10 shrink-0 text-right text-xs text-faint">
              {a.pct.toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
