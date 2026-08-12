"use client";

import type { RunningEntry, State } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { metaEfetiva, saldoColor, signed, toHMS } from "@/lib/horas";
import { cn } from "@/lib/utils";

/**
 * Cronômetro em andamento no Clockify (SOMENTE LEITURA) + débito do dia ao vivo.
 * O decorrido (`elapsedSec`) e o saldo de hoje descem/sobem a cada segundo:
 * saldoHoje = (lançado hoje + decorrido) − meta efetiva do dia.
 */
export function RunningTimer({
  db,
  hoje,
  running,
  elapsedSec,
  error,
}: {
  db: State;
  hoje: string;
  running: RunningEntry | null;
  elapsedSec: number;
  error?: string;
}) {
  const completedToday = db.registros[hoje] || 0;
  const metaHoje = metaEfetiva(db, hoje); // 0 em folga/feriado/férias
  const liveToday = completedToday + (running ? elapsedSec : 0);
  const saldoHoje = liveToday - metaHoje; // <0 = ainda falta; >=0 = crédito
  const faltam = Math.max(0, -saldoHoje);
  const pct = metaHoje > 0 ? Math.min(100, (liveToday / metaHoje) * 100) : 100;

  if (!running) {
    return (
      <Card className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="eyebrow">Cronômetro</span>
          <span className="text-faint">{error ? "indisponível agora" : "nenhum rodando"}</span>
        </div>
        <div className="text-right text-xs text-faint">
          hoje: <span className="num text-muted-foreground">{toHMS(completedToday)}</span>
          {metaHoje > 0 && <> de {toHMS(metaHoje)}</>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* o que está rodando */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-credit/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-credit" />
            </span>
            <span className="eyebrow">Rodando agora</span>
            {running.billable && (
              <Badge variant="credit" className="px-1.5 py-0">
                faturável
              </Badge>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {running.projectName && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-muted-foreground"
                  style={running.projectColor ? { background: running.projectColor } : undefined}
                />
                <span className="truncate font-medium">{running.projectName}</span>
              </span>
            )}
            {running.taskName && (
              <span className="truncate text-muted-foreground">· {running.taskName}</span>
            )}
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            {running.description || <span className="text-faint">(sem descrição)</span>}
          </div>
        </div>

        {/* decorrido vivo */}
        <div className="flex shrink-0 flex-col items-start sm:items-end">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Decorrido
          </span>
          <span className="num text-3xl font-bold leading-none tracking-tight text-credit tabular-nums sm:text-4xl">
            {toHMS(elapsedSec)}
          </span>
        </div>
      </div>

      {/* débito do dia — barra + linha decrescente */}
      <div className="border-t bg-muted/30 px-5 py-3">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              saldoHoje >= 0 ? "bg-credit" : "bg-today",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">
            Hoje: <span className="num text-foreground">{toHMS(liveToday)}</span>
            {metaHoje > 0 ? (
              <> de <span className="num">{toHMS(metaHoje)}</span></>
            ) : (
              <> (dia sem meta)</>
            )}
          </span>
          {metaHoje > 0 && saldoHoje < 0 ? (
            <span className="num font-semibold text-today tabular-nums">
              faltam {toHMS(faltam)}
            </span>
          ) : (
            <span className={cn("num font-semibold tabular-nums", saldoColor(saldoHoje))}>
              {signed(saldoHoje)}
              {metaHoje > 0 && saldoHoje >= 0 ? " acima da meta" : ""}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
