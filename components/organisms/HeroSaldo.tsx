"use client";

import type { State } from "@/types";
import { Card } from "@/components/ui/card";
import { SaldoValue } from "@/components/molecules/SaldoValue";
import { MonthStripCell } from "@/components/molecules/MonthStripCell";
import { mesConhecidoList, saldoGeral, saldoMes } from "@/lib/horas";

export function HeroSaldo({ db, hoje }: { db: State; hoje: string }) {
  const g = saldoGeral(db, hoje);
  const meses = mesConhecidoList(db);
  let run = 0;

  return (
    <Card className="px-7 py-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Saldo geral acumulado
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <SaldoValue
          sec={g}
          withSec
          className="text-[clamp(34px,9vw,62px)] font-bold leading-none tracking-tight"
        />
        {g > 0 ? (
          <Tag tone="credit">Crédito</Tag>
        ) : g < 0 ? (
          <Tag tone="debit">Débito</Tag>
        ) : (
          <Tag tone="zero">Zerado</Tag>
        )}
      </div>

      {meses.length === 0 ? (
        <div className="mt-5 border-t border-border pt-3.5 text-xs text-faint">
          Sem lançamentos ainda — abra o Clockify e sincronize, ou solte um ponto abaixo.
        </div>
      ) : (
        <div className="thin-scroll mt-5 flex max-h-[172px] flex-wrap overflow-y-auto border-t border-border">
          {meses.map((ym) => {
            const s = saldoMes(db, ym, hoje);
            run += s;
            return (
              <MonthStripCell
                key={ym}
                ym={ym}
                saldo={s}
                running={run}
                open={!db.fechados.find((f) => f.ym === ym)}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Tag({ tone, children }: { tone: "credit" | "debit" | "zero"; children: React.ReactNode }) {
  const tones = {
    credit: "bg-credit-bg text-credit",
    debit: "bg-debit-bg text-debit",
    zero: "bg-background text-muted-foreground",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
