"use client";

import { useRef } from "react";
import type { MeResponse, State } from "@/types";
import {
  MESES,
  carryIn,
  diasContabilizados,
  diasDoMes,
  dm,
  isUtil,
  metaDia,
  saldoColor,
  saldoMes,
  signed,
  toHMS,
} from "@/lib/horas";
import { cn } from "@/lib/utils";
import { MonthStats } from "./MonthStats";
import { DayTable } from "./DayTable";
import { LogForm, type LogFormHandle } from "./LogForm";

export function OpenMonthView({
  db,
  me,
  viewYM,
  hoje,
  metaMes,
  uteis,
  setRegistro,
  deleteRegistro,
  onShiftMonth,
  onSyncToday,
  onOpenImport,
  onBusyChange,
}: {
  db: State;
  me: MeResponse;
  viewYM: string;
  hoje: string;
  metaMes: number;
  uteis: number;
  setRegistro: (day: string, sec: number) => void;
  deleteRegistro: (day: string) => void;
  onShiftMonth: (ym: string) => void;
  onSyncToday: () => Promise<void>;
  onOpenImport: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const m = Number(viewYM.split("-")[1]);
  const DAY = db.metaDiaSec;
  const logFormRef = useRef<LogFormHandle>(null);

  const regs = Object.keys(db.registros)
    .filter((d) => d.startsWith(viewYM))
    .sort();
  const accounted = diasContabilizados(db, viewYM, hoje);
  const trabalhado = regs.reduce((a, d) => a + db.registros[d], 0);
  const metaAcum = accounted.reduce((a, d) => a + metaDia(db, d), 0);
  const faltando = accounted.filter((d) => db.registros[d] == null).length;
  const sMes = saldoMes(db, viewYM, hoje);
  const carry = carryIn(db, viewYM, hoje);
  const restUteis = diasDoMes(viewYM).filter(
    (d) => isUtil(db, d) && d >= hoje && db.registros[d] == null,
  ).length;

  const faltaZerar = metaMes - carry - trabalhado;
  const perDiaZerar = restUteis > 0 ? faltaZerar / restUteis : 0;
  const projetado8h = carry + (trabalhado + restUteis * DAY - metaMes);

  const hojeNoMes = hoje.startsWith(viewYM);
  const hojeReg = db.registros[hoje] != null;

  function onDelete(day: string) {
    if (confirm("Apagar o lançamento de " + dm(day) + "?")) deleteRegistro(day);
  }

  return (
    <>
      <MonthStats
        trabalhado={trabalhado}
        regsCount={regs.length}
        faltando={faltando}
        metaMes={metaMes}
        uteis={uteis}
        metaAcum={metaAcum}
        sMes={sMes}
        carry={carry}
      />

      {restUteis > 0 && (
        <div className="flex flex-wrap gap-6 border-t border-border bg-[#FAFBFC] px-5 py-4">
          <PlanItem
            dot="bg-accent"
            label={`Pra zerar o banco (${restUteis} dias restantes)`}
            value={`${signed(perDiaZerar, false).replace(/^\+/, "")}/dia`}
            valueClassName={perDiaZerar < 0 ? "saldo-neg" : undefined}
          />
          <PlanItem
            dot="bg-today"
            label={`Se mantiver a jornada, fecha ${MESES[m - 1]} com`}
            value={signed(projetado8h, false)}
            valueClassName={saldoColor(projetado8h)}
          />
        </div>
      )}

      <LogForm
        ref={logFormRef}
        viewYM={viewYM}
        hoje={hoje}
        registros={db.registros}
        cfConfigured={me.clockify.configured}
        onSubmit={setRegistro}
        onShiftMonth={onShiftMonth}
        onSyncToday={onSyncToday}
        onOpenImport={onOpenImport}
        onBusyChange={onBusyChange}
      />

      {hojeNoMes && isUtil(db, hoje) && !hojeReg && (
        <div className="px-5 pb-4 text-xs text-muted-foreground">
          Hoje (<b className="text-today">{dm(hoje)}</b>) ainda não foi lançado — é dia
          útil, meta {toHMS(DAY)}. Bata o ponto aí em cima quando fechar (ou solta parciais
          durante o dia).
        </div>
      )}

      <DayTable
        db={db}
        days={accounted.slice().reverse()}
        hoje={hoje}
        monthName={MESES[m - 1]}
        onEdit={(d) => logFormRef.current?.edit(d)}
        onDelete={onDelete}
      />
    </>
  );
}

function PlanItem({
  dot,
  label,
  value,
  valueClassName,
}: {
  dot: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn("inline-block size-[7px] rounded-full", dot)} />
        {label}
      </div>
      <div className={cn("num text-[15px] font-bold", valueClassName)}>{value}</div>
    </div>
  );
}
