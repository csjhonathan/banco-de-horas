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
}: {
  db: State;
  days: string[]; // já na ordem de exibição (reversa)
  hoje: string;
  monthName: string;
  onEdit: (d: string) => void;
  onDelete: (d: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Dia</Th>
            <Th right>Trabalhado</Th>
            <Th right className="hidden sm:table-cell">
              Meta
            </Th>
            <Th right>Saldo</Th>
            <Th right>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {days.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-faint">
                Nenhum lançamento em {monthName} ainda. Solta o primeiro ponto aí em cima.
              </td>
            </tr>
          ) : (
            days.map((d) => (
              <DayRow key={d} db={db} d={d} hoje={hoje} onEdit={onEdit} onDelete={onDelete} />
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
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-y border-border bg-[#FAFBFC] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-faint",
        right ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
