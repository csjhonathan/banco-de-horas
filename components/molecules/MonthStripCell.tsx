import { MESES, signed } from "@/lib/horas";
import { SaldoValue } from "./SaldoValue";
import { cn } from "@/lib/utils";

/** Célula de um mês na faixa do saldo (saldo do mês + acumulado). */
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
        "min-w-[84px] flex-1 border-r px-3 py-3 last:border-r-0",
        open && "bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="eyebrow tracking-wide">{MESES[m - 1].slice(0, 3)}</span>
        {open && <span className="size-1 rounded-full bg-today" />}
      </div>
      <SaldoValue sec={saldo} className="mt-1 block text-sm font-semibold" />
      <div className="num mt-0.5 text-[11px] text-faint">→ {signed(running, false)}</div>
    </div>
  );
}
