"use client";

import type { State } from "@/types";
import {
  SEMANAS,
  dm,
  isFeriado,
  isUtil,
  metaDia,
  parseD,
  saldoColor,
  signed,
  toHMS,
} from "@/lib/horas";
import { cn } from "@/lib/utils";

/** Uma linha da tabela do mês (um dia). */
export function DayRow({
  db,
  d,
  hoje,
  onEdit,
  onDelete,
}: {
  db: State;
  d: string;
  hoje: string;
  onEdit: (d: string) => void;
  onDelete: (d: string) => void;
}) {
  const has = db.registros[d] != null;
  const sec = has ? db.registros[d] : 0;
  const util = isUtil(db, d);
  const saldo = sec - metaDia(db, d);
  const folga = !util;
  const isHoje = d === hoje;

  return (
    <tr
      className={cn(
        "border-b border-border text-sm",
        isHoje ? "bg-today-bg" : "hover:bg-[#FAFBFC]",
        !has &&
          util &&
          "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(195,58,46,.035)_6px,rgba(195,58,46,.035)_12px)]",
      )}
    >
      <td className="px-3 py-3 sm:px-5">
        <span className={cn("num font-bold", !has && util && "text-muted-foreground")}>
          {dm(d)}
        </span>
        <span className="ml-2 text-[11px] font-medium capitalize text-muted-foreground">
          {SEMANAS[parseD(d).getDay()]}
        </span>
        {isHoje && <Badge tone="today">hoje</Badge>}
        {folga && (
          <Badge tone="accent">{isFeriado(db, d) ? "folga" : "fim de semana"}</Badge>
        )}
        {!has && util && <Badge tone="debit">não lançado</Badge>}
      </td>
      <td className="num px-3 py-3 text-right sm:px-5">{has ? toHMS(sec) : "—"}</td>
      <td className="num hidden px-3 py-3 text-right text-faint sm:table-cell sm:px-5">
        {folga ? "—" : toHMS(db.metaDiaSec)}
      </td>
      <td className={cn("num px-3 py-3 text-right sm:px-5", saldoColor(saldo))}>
        {signed(saldo, false)}
      </td>
      <td className="px-3 py-3 text-right sm:px-5">
        <div className="flex flex-wrap justify-end gap-1.5">
          <RowButton onClick={() => onEdit(d)}>{has ? "editar" : "lançar"}</RowButton>
          {has && (
            <RowButton danger onClick={() => onDelete(d)}>
              apagar
            </RowButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function Badge({ tone, children }: { tone: "today" | "accent" | "debit"; children: React.ReactNode }) {
  const tones = {
    today: "bg-today-bg text-today",
    accent: "bg-accent/10 text-accent",
    debit: "bg-debit-bg text-debit",
  };
  return (
    <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", tones[tone])}>
      {children}
    </span>
  );
}

function RowButton({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-1.5 py-1 text-[11px] font-semibold text-faint",
        danger ? "hover:text-destructive" : "hover:bg-background hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
