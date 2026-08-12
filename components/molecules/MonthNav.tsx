"use client";

import { BarChart3, ClipboardList } from "lucide-react";
import { MESES, signed } from "@/lib/horas";
import { cn } from "@/lib/utils";

/**
 * Barra de navegação de mês (‹ Mês Ano ›) + botão de Relatórios + resumo de meta.
 * Fica acima dos cards. `view`/`onToggleView` alternam entre o mês (ledger) e a
 * tela de relatórios; o botão vem logo ao lado da seta ›.
 */
export function MonthNav({
  viewYM,
  uteis,
  metaMes,
  onPrev,
  onNext,
  view,
  onToggleView,
}: {
  viewYM: string;
  uteis: number;
  metaMes: number;
  onPrev: () => void;
  onNext: () => void;
  view?: "mes" | "relatorios";
  onToggleView?: (v: "mes" | "relatorios") => void;
}) {
  const [y, m] = viewYM.split("-").map(Number);
  const reports = view === "relatorios";
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
        {onToggleView && (
          <button
            onClick={() => onToggleView(reports ? "mes" : "relatorios")}
            title={reports ? "Voltar aos lançamentos" : "Ver relatórios"}
            className={cn(
              "ml-1 inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors",
              reports
                ? "border-transparent bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {reports ? <ClipboardList className="size-4" /> : <BarChart3 className="size-4" />}
            <span className="hidden sm:inline">{reports ? "Lançamentos" : "Relatórios"}</span>
          </button>
        )}
      </div>
      {!reports && (
        <div className="text-sm text-muted-foreground">
          <b className="font-medium text-foreground">{uteis}</b> dias úteis · meta{" "}
          <b className="num font-medium text-foreground">
            {signed(metaMes, false).replace("+", "")}
          </b>
        </div>
      )}
    </div>
  );
}
