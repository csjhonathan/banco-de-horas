import { saldoColor, signed, toHMS } from "@/lib/horas";
import { StatTile } from "@/components/molecules/StatTile";

/** Grade de 4 estatísticas do mês aberto. */
export function MonthStats({
  trabalhado,
  regsCount,
  faltando,
  metaMes,
  uteis,
  metaAcum,
  sMes,
  carry,
}: {
  trabalhado: number;
  regsCount: number;
  faltando: number;
  metaMes: number;
  uteis: number;
  metaAcum: number;
  sMes: number;
  carry: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
      <StatTile
        label="Trabalhado"
        value={toHMS(trabalhado)}
        sub={
          <>
            {regsCount} dia(s) lançado(s)
            {faltando ? <span className="text-destructive"> · {faltando} em aberto</span> : null}
          </>
        }
      />
      <StatTile
        label="Meta do mês"
        value={toHMS(metaMes)}
        sub={`${uteis} dias úteis · ${toHMS(metaAcum)} até hoje`}
      />
      <StatTile
        label="Saldo do mês"
        value={signed(sMes, false)}
        valueClassName={saldoColor(sMes)}
        sub="acumulado até hoje"
      />
      <StatTile
        label="Entrou de saldo"
        value={signed(carry, false)}
        valueClassName={saldoColor(carry)}
        sub="meses anteriores"
      />
    </div>
  );
}
