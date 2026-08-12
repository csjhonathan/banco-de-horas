"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { State } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDayTasks } from "@/hooks/useDayTasks";
import { sliceColor } from "@/lib/chartColors";
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
  clockifyConfigured,
  onEdit,
  onDelete,
  onTogglePresencial,
  onOpenAtestado,
}: {
  db: State;
  d: string;
  hoje: string;
  clockifyConfigured?: boolean;
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
  const canExpand = !!clockifyConfigured && has; // tarefas vêm do Clockify
  const [open, setOpen] = useState(false);
  const { tasks, loading, error } = useDayTasks(d, open && canExpand);

  return (
    <>
    <tr
      className={cn(
        "border-b text-sm transition-colors last:border-b-0",
        isHoje ? "bg-today/[0.06]" : "hover:bg-muted/40",
      )}
    >
      <td className="px-4 py-2.5">
        {canExpand && (
          <button
            onClick={() => setOpen((v) => !v)}
            title={open ? "Ocultar tarefas do dia" : "Ver tarefas do dia"}
            className="mr-1.5 inline-grid size-5 place-items-center rounded text-muted-foreground/60 transition-colors hover:text-foreground align-middle"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        )}
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
    {open && canExpand && (
      <tr className="border-b bg-muted/20 text-sm last:border-b-0">
        <td colSpan={6} className="px-4 py-3 pl-11">
          {loading ? (
            <div className="text-[13px] text-faint">Carregando tarefas…</div>
          ) : error ? (
            <div className="text-[13px] text-destructive">{error}</div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="text-[13px] text-faint">Sem tarefas detalhadas neste dia.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((t, i) => (
                <li
                  key={t.id}
                  className="animate-rise flex items-center gap-2 text-[13px]"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: sliceColor(t, i) }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {t.name}
                    {t.project && <span className="ml-1.5 text-xs text-faint">· {t.project}</span>}
                  </span>
                  <span className="num shrink-0 tabular-nums text-muted-foreground">
                    {toHMS(t.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </td>
      </tr>
    )}
    </>
  );
}
