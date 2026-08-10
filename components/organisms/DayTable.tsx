"use client";

import type { State } from "@/types";
import { DayRow } from "@/components/molecules/DayRow";
import { cn } from "@/lib/utils";

/** Tabela dos dias contabilizados do mês (mais recentes primeiro). */
export function DayTable({
  db,
  days,
  hoje,
  monthName,
  onEdit,
  onDelete,
  onTogglePresencial,
  onOpenAtestado,
}: {
  db: State;
  days: string[];
  hoje: string;
  monthName: string;
  onEdit: (d: string) => void;
  onDelete: (d: string) => void;
  onTogglePresencial: (d: string) => void;
  onOpenAtestado: (d: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Dia</Th>
            <Th right>Trabalhado</Th>
            <Th right className="hidden sm:table-cell">Meta</Th>
            <Th right>Saldo</Th>
            <Th center>Presencial</Th>
            <Th right>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {days.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-faint">
                Nenhum lançamento em {monthName} ainda. Solta o primeiro ponto aí em cima.
              </td>
            </tr>
          ) : (
            days.map((d) => (
              <DayRow
                key={d}
                db={db}
                d={d}
                hoje={hoje}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePresencial={onTogglePresencial}
                onOpenAtestado={onOpenAtestado}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  right,
  center,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-y bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        right ? "text-right" : center ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
