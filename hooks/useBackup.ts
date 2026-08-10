"use client";

import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { State } from "@/types";
import { API } from "@/lib/api";
import { migrate } from "@/lib/seed";
import { clockifyCSVtoRegistros } from "@/lib/csv";

/** Backup (export/import JSON + CSV do Clockify) e reset. */
export function useBackup({
  dbRef,
  replaceFromServer,
  setViewYM,
  hoje,
}: {
  dbRef: MutableRefObject<State | null>;
  replaceFromServer: (s: State) => void;
  setViewYM: (ym: string) => void;
  hoje: string;
}) {
  const exportBackup = useCallback(() => {
    const cur = dbRef.current;
    if (!cur) return;
    const blob = new Blob([JSON.stringify(cur, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "banco-de-horas-" + hoje + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [dbRef, hoje]);

  const importCSVText = useCallback(
    async (text: string) => {
      const cur = dbRef.current!;
      let reg: Record<string, number>;
      try {
        reg = clockifyCSVtoRegistros(text);
      } catch {
        alert("Não encontrei lançamentos nesse CSV.");
        return;
      }
      const days = Object.keys(reg);
      if (!days.length) {
        alert("Não encontrei lançamentos nesse CSV.");
        return;
      }
      if (
        !confirm(
          "Importar " +
            days.length +
            " dia(s) do CSV do Clockify? Os dias correspondentes serão sobrescritos.",
        )
      )
        return;
      const next: State = { ...cur, registros: { ...cur.registros } };
      for (const [d, sec] of Object.entries(reg)) next.registros[d] = sec;
      await API.putState(next);
      replaceFromServer(next);
      const sorted = days.sort();
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      setViewYM((max || hoje).slice(0, 7));
      alert(days.length + " dia(s) importado(s) do Clockify (" + min + " a " + max + ").");
    },
    [dbRef, replaceFromServer, setViewYM, hoje],
  );

  const importBackup = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,.csv,application/json,text/csv";
    inp.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const isCSV = /\.csv$/i.test(file.name);
      const cur = dbRef.current!;
      try {
        if (isCSV) return importCSVText(text);
        let j: any;
        try {
          j = JSON.parse(text);
        } catch {
          return importCSVText(text);
        }
        if (!j || typeof j !== "object" || !j.registros) throw new Error("json");
        let next: State;
        if (j.feriados && j.fechados) {
          if (
            !confirm(
              "Backup completo — restaurar substitui TUDO (lançamentos, meses e feriados). Continuar?",
            )
          )
            return;
          next = j as State;
        } else {
          next = { ...cur, registros: { ...cur.registros } };
          let n = 0;
          for (const [d, sec] of Object.entries(j.registros)) {
            if (typeof sec === "number") {
              next.registros[d] = sec;
              n++;
            }
          }
          alert(n + " dia(s) importado(s) e mesclado(s).");
        }
        migrate(next);
        await API.putState(next);
        replaceFromServer(next);
        setViewYM(hoje.slice(0, 7));
      } catch {
        alert(
          "Arquivo inválido. Aceito: backup do app (JSON), { registros:{...} } ou o CSV de Relatório Detalhado do Clockify.",
        );
      }
    };
    inp.click();
  }, [dbRef, replaceFromServer, setViewYM, hoje, importCSVText]);

  const reset = useCallback(async () => {
    if (
      !confirm(
        "Reiniciar tudo? Isso apaga os seus lançamentos e volta ao estado vazio (só feriados oficiais).",
      )
    )
      return;
    try {
      const fresh = await API.reset();
      replaceFromServer(fresh);
      setViewYM(hoje.slice(0, 7));
    } catch (e) {
      alert("Não consegui reiniciar: " + (e instanceof Error ? e.message : ""));
    }
  }, [replaceFromServer, setViewYM, hoje]);

  return { exportBackup, importBackup, reset };
}
