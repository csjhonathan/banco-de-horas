"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { State } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/molecules/Field";
import { agruparPeriodos, isDiaTrabalho, rangeDias } from "@/lib/horas";

/** "AAAA-MM-DD" -> "DD/MM/AAAA". */
function br(s: string): string {
  return s.split("-").reverse().join("/");
}
/** Formata um período {de, ate} p/ exibição ("12/08/2026" ou "12/08/2026 – 20/08/2026"). */
function fmtPeriodo(de: string, ate: string): string {
  return de === ate ? br(de) : `${br(de)} – ${br(ate)}`;
}

/**
 * Painel de férias: adiciona um período (intervalo de datas) e lista os
 * períodos cadastrados, agrupando dias contíguos. Dias de férias não contam
 * meta nem geram débito (ver `isUtil`/`isFerias`).
 */
export function FeriasPanel({
  db,
  hoje,
  addFerias,
  removeFerias,
}: {
  db: State;
  hoje: string;
  addFerias: (de: string, ate: string) => void;
  removeFerias: (de: string, ate: string) => void;
}) {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const periodos = agruparPeriodos(Object.keys(db.ferias ?? {}).filter((d) => db.ferias[d]));

  function remove(p: { de: string; ate: string }) {
    // Período que já terminou: pede confirmação (histórico, não deve sumir por engano).
    if (p.ate < hoje && !confirm(`Apagar as férias de ${fmtPeriodo(p.de, p.ate)}?`)) return;
    removeFerias(p.de, p.ate);
  }

  function add() {
    if (!de) {
      alert("Escolhe a data de início das férias.");
      return;
    }
    addFerias(de, ate || de);
    setDe("");
    setAte("");
  }

  return (
    <details className="rounded-xl border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-bold text-muted-foreground [&::-webkit-details-marker]:hidden">
        Férias <span className="text-faint">›</span>
      </summary>
      <div className="px-5 pb-4 pt-1">
        <div className="mb-3.5 flex flex-col gap-1.5">
          {periodos.length === 0 ? (
            <div className="text-xs text-faint">Nenhum período de férias cadastrado.</div>
          ) : (
            periodos.map((p) => {
              // dias que SERIAM de trabalho no período (ignora o flag de férias;
              // desconta feriados que já conhecemos).
              const uteis = rangeDias(p.de, p.ate).filter((d) => isDiaTrabalho(db, d)).length;
              const passada = p.ate < hoje;
              return (
                <div
                  key={p.de}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                >
                  <span className="num text-[13px]">
                    {fmtPeriodo(p.de, p.ate)}
                    <span className="ml-2 text-xs text-faint">
                      {uteis} {uteis === 1 ? "dia útil" : "dias úteis"}
                    </span>
                    {passada && (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        concluídas
                      </Badge>
                    )}
                  </span>
                  <button
                    onClick={() => remove(p)}
                    title={passada ? "Remover (período já concluído)" : "Remover período"}
                    className="text-muted-foreground/50 transition-colors hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2.5 border-t border-border pt-3">
          <Field label="Início">
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </Field>
          <Field label="Fim">
            <Input
              type="date"
              value={ate}
              min={de || undefined}
              onChange={(e) => setAte(e.target.value)}
            />
          </Field>
          <Button variant="ghost" onClick={add}>
            Adicionar férias
          </Button>
        </div>
        <p className="mt-2.5 text-xs text-faint">
          Dias de férias não contam meta nem viram débito.{" "}
          <Badge variant="secondary" className="align-middle">
            férias
          </Badge>
        </p>
      </div>
    </details>
  );
}
