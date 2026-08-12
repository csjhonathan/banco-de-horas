"use client";

import { Check } from "lucide-react";
import type { State } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SEMANAS,
  atestadoDe,
  dm,
  isFeriado,
  isFerias,
  isUtil,
  metaEfetiva,
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
  onTogglePresencial,
  onOpenAtestado,
}: {
  db: State;
  d: string;
  hoje: string;
  onEdit: (d: string) => void;
  onDelete: (d: string) => void;
  onTogglePresencial: (d: string) => void;
  onOpenAtestado: (d: string) => void;
}) {
  const has = db.registros[d] != null;
  const sec = has ? db.registros[d] : 0;
  const util = isUtil(db, d);
  const atestado = atestadoDe(db, d);
  const metaEf = metaEfetiva(db, d);
  const saldo = sec - metaEf; // meta já descontou o atestado
  const folga = !util;
  const isHoje = d === hoje;
  const missing = !has && util && metaEf > 0;
  const presente = !!db.presencial[d];

  return (
    <tr
      className={cn(
        "border-b text-sm transition-colors last:border-b-0",
        isHoje ? "bg-today/[0.06]" : "hover:bg-muted/40",
      )}
    >
      <td className="px-4 py-2.5">
        <span className={cn("num font-medium", missing && "text-muted-foreground")}>{dm(d)}</span>
        <span className="ml-2 text-xs capitalize text-muted-foreground">
          {SEMANAS[parseD(d).getDay()]}
        </span>
        {isHoje && <Badge variant="today" className="ml-2">hoje</Badge>}
        {folga && (
          <Badge variant="secondary" className="ml-2">
            {isFerias(db, d) ? "férias" : isFeriado(db, d) ? "folga" : "descanso"}
          </Badge>
        )}
        {atestado > 0 && (
          <button
            onClick={() => onOpenAtestado(d)}
            title="Editar/remover atestado"
            className="ml-2 align-middle"
          >
            <Badge variant="credit" className="cursor-pointer hover:brightness-95">
              atestado {toHMS(atestado).slice(0, 5)}
            </Badge>
          </button>
        )}
        {missing && <Badge variant="debit" className="ml-2">não lançado</Badge>}
      </td>
      <td className="num px-4 py-2.5 text-right">{has ? toHMS(sec) : "—"}</td>
      <td className="num hidden px-4 py-2.5 text-right text-faint sm:table-cell">
        {util ? toHMS(metaEf) : "—"}
      </td>
      <td className={cn("num px-4 py-2.5 text-right font-medium", saldoColor(saldo))}>
        {signed(saldo, false)}
      </td>
      <td className="px-2 py-2.5 text-center">
        <button
          onClick={() => onTogglePresencial(d)}
          title={presente ? "Foi ao escritório — clique p/ desmarcar" : "Marcar presencial"}
          className={cn(
            "mx-auto grid size-6 place-items-center rounded-md border transition-colors",
            presente
              ? "border-transparent bg-credit/15 text-credit"
              : "border-input text-muted-foreground/40 hover:text-foreground",
          )}
        >
          <Check className={cn("size-3.5", !presente && "opacity-40")} />
        </button>
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(d)} className="h-7 px-2 text-xs text-muted-foreground">
            {has ? "editar" : "lançar"}
          </Button>
          {has && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(d)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              apagar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
