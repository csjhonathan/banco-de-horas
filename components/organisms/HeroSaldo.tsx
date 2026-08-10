"use client";

import type { State } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SaldoValue } from "@/components/molecules/SaldoValue";
import { MonthStripCell } from "@/components/molecules/MonthStripCell";
import { mesConhecidoList, saldoGeral, saldoMes } from "@/lib/horas";

export function HeroSaldo({ db, hoje }: { db: State; hoje: string }) {
  const g = saldoGeral(db, hoje);
  const meses = mesConhecidoList(db);
  let run = 0;

  return (
    <Card className="flex flex-col lg:flex-row">
      {/* saldo geral — largura pelo conteúdo, sem vazar */}
      <div className="flex shrink-0 flex-col justify-center gap-2 px-6 py-5 lg:pr-10">
        <div className="flex items-center gap-2.5">
          <span className="eyebrow">Saldo acumulado</span>
          {g > 0 ? (
            <Badge variant="credit">Crédito</Badge>
          ) : g < 0 ? (
            <Badge variant="debit">Débito</Badge>
          ) : (
            <Badge variant="secondary">Zerado</Badge>
          )}
        </div>
        <SaldoValue
          sec={g}
          withSec
          className="whitespace-nowrap text-4xl font-bold leading-none tracking-tight sm:text-5xl"
        />
      </div>

      {/* linha do tempo dos meses */}
      {meses.length > 0 ? (
        <div className="thin-scroll flex min-w-0 flex-1 overflow-x-auto border-t lg:border-l lg:border-t-0">
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
      ) : (
        <div className="flex flex-1 items-center border-t p-6 text-sm text-muted-foreground lg:border-l lg:border-t-0">
          Sem lançamentos ainda — conecte o Clockify e sincronize, ou lance um dia abaixo.
        </div>
      )}
    </Card>
  );
}
