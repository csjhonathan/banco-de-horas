"use client";

import { useRef, type ReactNode } from "react";
import type { MeResponse, State } from "@/types";
import { Card } from "@/components/ui/card";
import {
  MESES,
  carryIn,
  diasContabilizados,
  diasDoMes,
  dm,
  isUtil,
  metaEfetiva,
  saldoMes,
} from "@/lib/horas";
import type { CheckInResult } from "@/hooks/useBancoDeHoras";
import { DayTable } from "./DayTable";
import { LogForm, type LogFormHandle } from "./LogForm";
import { StatsRail } from "./StatsRail";
import { ClockifyPanel } from "./ClockifyPanel";
import { EscritorioPanel } from "./EscritorioPanel";
import { FeriadosPanel } from "./FeriadosPanel";

export function OpenMonthBento({
  nav,
  db,
  me,
  viewYM,
  hoje,
  metaMes,
  uteis,
  setRegistro,
  deleteRegistro,
  setFeriado,
  deleteFeriado,
  togglePresencial,
  setPresencial,
  onShiftMonth,
  onSyncToday,
  onOpenImport,
  onOpenClockify,
  onOpenAtestado,
  onCheckIn,
  onOpenEscritorio,
  onBusyChange,
}: {
  nav: ReactNode;
  db: State;
  me: MeResponse;
  viewYM: string;
  hoje: string;
  metaMes: number;
  uteis: number;
  setRegistro: (day: string, sec: number) => void;
  deleteRegistro: (day: string) => void;
  setFeriado: (day: string, name: string) => void;
  deleteFeriado: (day: string) => void;
  togglePresencial: (day: string) => void;
  setPresencial: (day: string, val: boolean) => void;
  onShiftMonth: (ym: string) => void;
  onSyncToday: () => Promise<void>;
  onOpenImport: () => void;
  onOpenClockify: () => void;
  onOpenAtestado: (day?: string) => void;
  onCheckIn: () => Promise<CheckInResult>;
  onOpenEscritorio: () => void;
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
  const metaAcum = accounted.reduce((a, d) => a + metaEfetiva(db, d), 0);
  const faltando = accounted.filter((d) => db.registros[d] == null).length;
  const sMes = saldoMes(db, viewYM, hoje);
  const carry = carryIn(db, viewYM, hoje);
  const restUteis = diasDoMes(viewYM).filter(
    (d) => isUtil(db, d) && d >= hoje && db.registros[d] == null,
  ).length;

  const perDiaZerar = restUteis > 0 ? (metaMes - carry - trabalhado) / restUteis : 0;
  const projetado = carry + (trabalhado + restUteis * DAY - metaMes);

  function onDelete(day: string) {
    if (confirm("Apagar o lançamento de " + dm(day) + "?")) deleteRegistro(day);
  }

  return (
    <section className="flex flex-col gap-4">
      {nav}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* ledger */}
        <Card>
          <LogForm
            ref={logFormRef}
            viewYM={viewYM}
            hoje={hoje}
            registros={db.registros}
            onSubmit={setRegistro}
            onShiftMonth={onShiftMonth}
            onBusyChange={onBusyChange}
            onOpenAtestado={onOpenAtestado}
          />
          <DayTable
            db={db}
            days={accounted.slice().reverse()}
            hoje={hoje}
            monthName={MESES[m - 1]}
            onEdit={(d) => logFormRef.current?.edit(d)}
            onDelete={onDelete}
            onTogglePresencial={togglePresencial}
            onOpenAtestado={onOpenAtestado}
          />
        </Card>

        {/* trilho de contexto */}
        <aside className="flex flex-col gap-5">
          <StatsRail
            sMes={sMes}
            trabalhado={trabalhado}
            regsCount={regs.length}
            faltando={faltando}
            metaMes={metaMes}
            metaAcum={metaAcum}
            uteis={uteis}
            carry={carry}
            restUteis={restUteis}
            perDiaZerar={perDiaZerar}
            projetado={projetado}
            mesLabel={MESES[m - 1]}
          />
          <ClockifyPanel
            me={me}
            onSyncToday={onSyncToday}
            onOpenImport={onOpenImport}
            onOpenClockify={onOpenClockify}
          />
          <EscritorioPanel
            db={db}
            hoje={hoje}
            onCheckIn={onCheckIn}
            onOpenEscritorio={onOpenEscritorio}
            setPresencial={setPresencial}
          />
          <FeriadosPanel db={db} setFeriado={setFeriado} deleteFeriado={deleteFeriado} />
        </aside>
      </div>
    </section>
  );
}
