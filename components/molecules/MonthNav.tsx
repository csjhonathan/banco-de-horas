"use client";

import { MESES, signed } from "@/lib/horas";

/** Cabeçalho de navegação de mês: ‹ Mês Ano › + resumo de meta. */
export function MonthNav({
  viewYM,
  uteis,
  metaMes,
  onPrev,
  onNext,
}: {
  viewYM: string;
  uteis: number;
  metaMes: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [y, m] = viewYM.split("-").map(Number);
  return (
    <div className="flex flex-col items-start justify-between gap-2.5 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <button
          aria-label="Mês anterior"
          onClick={onPrev}
          className="grid size-[30px] place-items-center rounded-md border border-border text-muted-foreground hover:border-faint hover:text-foreground"
        >
          ‹
        </button>
        <div className="min-w-[150px] text-center text-[17px] font-bold">
          {MESES[m - 1]} {y}
        </div>
        <button
          aria-label="Próximo mês"
          onClick={onNext}
          className="grid size-[30px] place-items-center rounded-md border border-border text-muted-foreground hover:border-faint hover:text-foreground"
        >
          ›
        </button>
      </div>
      <div className="text-xs text-muted-foreground sm:text-right">
        <b className="font-bold text-foreground">{uteis}</b> dias úteis · meta{" "}
        <b className="font-bold text-foreground">{signed(metaMes, false).replace("+", "")}</b>
      </div>
    </div>
  );
}
