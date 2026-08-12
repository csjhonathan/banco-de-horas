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
  isDiaTrabalho,
  isUtil,
  metaDia,
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
import { FeriasPanel } from "./FeriasPanel";

export function OpenMonthBento({
  nav,
  db,
  liveDb,
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
  addFerias,
  removeFerias,
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
  liveDb: State;
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
  addFerias: (de: string, ate: string) => void;
  removeFerias: (de: string, ate: string) => void;
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
  const logFormRef = useRef<LogFormHandle>(null);

  // Tempo do cronômetro em andamento HOJE (deriva de liveDb − db, que o Dashboard
  // já mantém somando o decorrido). Faz a linha de hoje refletir o timer.
  const runningToday = Math.max(
    0,
    (liveDb.registros[hoje] ?? 0) - (db.registros[hoje] ?? 0),
  );

  // ---- ledger (persistido): tabela usa `db` real, sem o cronômetro ----
  // Dias exibidos na tabela: os contabilizados + dias com presencial/atestado
  // marcado (ex.: hoje ainda sem lançamento) + dias de férias que seriam de
  // trabalho + hoje se houver timer rodando — pra nada ficar invisível (fim de
  // semana dentro das férias não vira linha).
  const displayDays = [
    ...new Set([
      ...diasContabilizados(db, viewYM, hoje),
      ...Object.keys(db.presencial ?? {}).filter((d) => db.presencial[d] && d.startsWith(viewYM)),
      ...Object.keys(db.atestados ?? {}).filter((d) => db.atestados[d] && d.startsWith(viewYM)),
      ...Object.keys(db.ferias ?? {}).filter(
        (d) => db.ferias[d] && d.startsWith(viewYM) && isDiaTrabalho(db, d),
      ),
      ...(runningToday > 0 && hoje.startsWith(viewYM) ? [hoje] : []),
    ]),
  ].sort();

  // ---- estatísticas (ao vivo): usam `liveDb`, que soma o cronômetro em hoje ----
  const accounted = diasContabilizados(liveDb, viewYM, hoje);
  const regs = Object.keys(liveDb.registros).filter((d) => d.startsWith(viewYM));
  const trabalhado = regs.reduce((a, d) => a + liveDb.registros[d], 0);
  const metaAcum = accounted.reduce((a, d) => a + metaEfetiva(liveDb, d), 0);
  const faltando = accounted.filter((d) => liveDb.registros[d] == null).length;
  const sMes = saldoMes(liveDb, viewYM, hoje);
  const carry = carryIn(liveDb, viewYM, hoje);
  const restDias = diasDoMes(viewYM).filter(
    (d) => isUtil(liveDb, d) && d >= hoje && liveDb.registros[d] == null,
  );
  const restUteis = restDias.length;
  // meta que ainda falta cumprir nos dias úteis restantes — soma dia a dia p/
  // respeitar jornada que muda no meio do mês.
  const metaResto = restDias.reduce((a, d) => a + metaDia(liveDb, d), 0);

  const perDiaZerar = restUteis > 0 ? (metaMes - carry - trabalhado) / restUteis : 0;
  const projetado = carry + (trabalhado + metaResto - metaMes);

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
            days={displayDays.slice().reverse()}
            hoje={hoje}
            monthName={MESES[m - 1]}
            clockifyConfigured={me.clockify.configured}
            runningToday={runningToday}
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
          <FeriasPanel db={db} hoje={hoje} addFerias={addFerias} removeFerias={removeFerias} />
          <FeriadosPanel db={db} setFeriado={setFeriado} deleteFeriado={deleteFeriado} />
        </aside>
      </div>
    </section>
  );
}
