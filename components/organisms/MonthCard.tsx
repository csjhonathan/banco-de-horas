"use client";

import type { MeResponse, State } from "@/types";
import { Card } from "@/components/ui/card";
import { MonthNav } from "@/components/molecules/MonthNav";
import { diasUteisMes, shiftMonth } from "@/lib/horas";
import { OpenMonthView } from "./OpenMonthView";
import { ClosedMonthView } from "./ClosedMonthView";

/** Card do mês: navegação + mês aberto (lançável) OU mês fechado (consolidado). */
export function MonthCard({
  db,
  me,
  viewYM,
  hoje,
  onShiftMonth,
  setRegistro,
  deleteRegistro,
  recalibrar,
  onSyncToday,
  onOpenImport,
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
  onSyncToday: () => Promise<void>;
  onOpenImport: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fechado = db.fechados.find((x) => x.ym === viewYM);
  const uteis = fechado ? fechado.dias : diasUteisMes(db, viewYM);
  const metaMes = uteis * db.metaDiaSec;

  return (
    <Card>
      <MonthNav
        viewYM={viewYM}
        uteis={uteis}
        metaMes={metaMes}
        onPrev={() => onShiftMonth(shiftMonth(viewYM, -1))}
        onNext={() => onShiftMonth(shiftMonth(viewYM, 1))}
      />
      {fechado ? (
        <ClosedMonthView db={db} fechado={fechado} recalibrar={recalibrar} />
      ) : (
        <OpenMonthView
          db={db}
          me={me}
          viewYM={viewYM}
          hoje={hoje}
          metaMes={metaMes}
          uteis={uteis}
          setRegistro={setRegistro}
          deleteRegistro={deleteRegistro}
          onShiftMonth={onShiftMonth}
          onSyncToday={onSyncToday}
          onOpenImport={onOpenImport}
          onBusyChange={onBusyChange}
        />
      )}
    </Card>
  );
}
