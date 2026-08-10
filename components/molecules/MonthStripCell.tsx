import { MESES, signed } from "@/lib/horas";
import { SaldoValue } from "./SaldoValue";
import { cn } from "@/lib/utils";

/** Célula de um mês na faixa do saldo geral (saldo do mês + acumulado). */
export function MonthStripCell({
  ym,
  saldo,
  running,
  open,
}: {
  ym: string;
  saldo: number;
  running: number;
  open: boolean;
}) {
  const m = Number(ym.split("-")[1]);
  return (
    <div
      className={cn(
        "relative min-w-[88px] flex-1 border-r border-border px-1 pb-0.5 pt-3.5 last:border-r-0",
        open && "bg-gradient-to-b from-today-bg to-transparent",
      )}
    >
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.1em]",
          open ? "text-today" : "text-faint",
        )}
      >
        {MESES[m - 1].slice(0, 3)}
        {open ? " ·" : ""}
      </div>
      <SaldoValue sec={saldo} className="mt-0.5 block text-[15px] font-bold" />
      <div className="num mt-px text-[11px] text-faint">→ {signed(running, false)}</div>
    </div>
  );
}
