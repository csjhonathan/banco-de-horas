"use client";

import { MESES, signed } from "@/lib/horas";

/** Barra de navegação de mês (‹ Mês Ano ›) + resumo de meta. Fica acima dos cards. */
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          aria-label="Mês anterior"
          onClick={onPrev}
          className="grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ‹
        </button>
        <h2 className="min-w-[132px] text-center text-lg font-semibold tracking-tight">
          {MESES[m - 1]} {y}
        </h2>
        <button
          aria-label="Próximo mês"
          onClick={onNext}
          className="grid size-8 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ›
        </button>
      </div>
      <div className="text-sm text-muted-foreground">
        <b className="font-medium text-foreground">{uteis}</b> dias úteis · meta{" "}
        <b className="num font-medium text-foreground">{signed(metaMes, false).replace("+", "")}</b>
      </div>
    </div>
  );
}
