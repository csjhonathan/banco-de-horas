import { Card } from "@/components/ui/card";
import { SaldoValue } from "@/components/molecules/SaldoValue";
import { saldoColor, signed, toHMS } from "@/lib/horas";
import { cn } from "@/lib/utils";

/** Resumo do mês no trilho: saldo em destaque, detalhes e planejamento. */
export function StatsRail({
  sMes,
  trabalhado,
  regsCount,
  faltando,
  metaMes,
  metaAcum,
  uteis,
  carry,
  restUteis,
  perDiaZerar,
  projetado,
  mesLabel,
}: {
  sMes: number;
  trabalhado: number;
  regsCount: number;
  faltando: number;
  metaMes: number;
  metaAcum: number;
  uteis: number;
  carry: number;
  restUteis: number;
  perDiaZerar: number;
  projetado: number;
  mesLabel: string;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <span className="eyebrow">Saldo do mês</span>
        <SaldoValue sec={sMes} withSec className="mt-1 block text-3xl font-bold leading-none" />
        <span className="mt-1 block text-xs text-muted-foreground">acumulado até hoje</span>
      </div>

      <dl className="flex flex-col gap-3 border-t pt-4 text-sm">
        <Row
          label="Trabalhado"
          sub={
            <>
              {regsCount} dia(s)
              {faltando ? <span className="text-destructive"> · {faltando} em aberto</span> : null}
            </>
          }
          value={toHMS(trabalhado)}
        />
        <Row label="Meta do mês" sub={`${uteis} úteis · ${toHMS(metaAcum)} até hoje`} value={toHMS(metaMes)} />
        <Row
          label="Entrou de saldo"
          sub="meses anteriores"
          value={<span className={cn("num", saldoColor(carry))}>{signed(carry, false)}</span>}
        />
      </dl>

      {restUteis > 0 && (
        <div className="flex flex-col gap-2.5 border-t pt-4">
          <span className="eyebrow">Planejamento</span>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Pra zerar · {restUteis}d restantes</span>
            <span className={cn("num font-semibold", perDiaZerar < 0 && "saldo-neg")}>
              {signed(perDiaZerar, false).replace(/^\+/, "")}/dia
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Fecha {mesLabel} com</span>
            <span className={cn("num font-semibold", saldoColor(projetado))}>
              {signed(projetado, false)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex flex-col">
        <dt className="text-foreground">{label}</dt>
        {sub != null && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
