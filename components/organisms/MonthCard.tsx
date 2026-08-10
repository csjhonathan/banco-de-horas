"use client";

import type { MeResponse, State } from "@/types";
import { Card } from "@/components/ui/card";
import { MonthNav } from "@/components/molecules/MonthNav";
import { diasUteisMes, shiftMonth } from "@/lib/horas";
import { OpenMonthBento } from "./OpenMonthBento";
import { ClosedMonthView } from "./ClosedMonthView";

/**
 * Área de trabalho do mês: barra de navegação (full-width) + bento de 2 colunas
 * quando o mês está aberto, ou o card consolidado quando está fechado.
 */
export function MonthCard({
  db,
  me,
  viewYM,
  hoje,
  onShiftMonth,
  setRegistro,
  deleteRegistro,
  recalibrar,
  setFeriado,
  deleteFeriado,
  togglePresencial,
  onSyncToday,
  onOpenImport,
  onOpenClockify,
  onOpenAtestado,
  onBusyChange,
}: {
  db: State;
  me: MeResponse;
  viewYM: string;
  hoje: string;
  onShiftMonth: (ym: string) => void;
  setRegistro: (day: string, sec: number) => void;
  deleteRegistro: (day: string) => void;
  recalibrar: (ym: string, dias: number, trab: number) => void;
  setFeriado: (day: string, name: string) => void;
  deleteFeriado: (day: string) => void;
  togglePresencial: (day: string) => void;
  onSyncToday: () => Promise<void>;
  onOpenImport: () => void;
  onOpenClockify: () => void;
  onOpenAtestado: (day?: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fechado = db.fechados.find((x) => x.ym === viewYM);
  const uteis = fechado ? fechado.dias : diasUteisMes(db, viewYM);
  const metaMes = uteis * db.metaDiaSec;

  const nav = (
    <MonthNav
      viewYM={viewYM}
      uteis={uteis}
      metaMes={metaMes}
      onPrev={() => onShiftMonth(shiftMonth(viewYM, -1))}
      onNext={() => onShiftMonth(shiftMonth(viewYM, 1))}
    />
  );

  if (fechado) {
    return (
      <section className="flex flex-col gap-5">
        {nav}
        <Card>
          <ClosedMonthView db={db} fechado={fechado} recalibrar={recalibrar} />
        </Card>
      </section>
    );
  }

  return (
    <OpenMonthBento
      nav={nav}
      db={db}
      me={me}
      viewYM={viewYM}
      hoje={hoje}
      metaMes={metaMes}
      uteis={uteis}
      setRegistro={setRegistro}
      deleteRegistro={deleteRegistro}
      setFeriado={setFeriado}
      deleteFeriado={deleteFeriado}
      togglePresencial={togglePresencial}
      onShiftMonth={onShiftMonth}
      onSyncToday={onSyncToday}
      onOpenImport={onOpenImport}
      onOpenClockify={onOpenClockify}
      onOpenAtestado={onOpenAtestado}
      onBusyChange={onBusyChange}
    />
  );
}
