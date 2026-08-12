"use client";

import { useEffect, useState } from "react";
import type { BreakdownSlice } from "@/types";
import { API } from "@/lib/api";

/**
 * Tarefas de um dia específico (SOMENTE LEITURA) — reaproveita o breakdown com
 * start=end=day. Busca de forma preguiçosa: só quando `open` (linha expandida).
 */
export function useDayTasks(day: string, open: boolean) {
  const [tasks, setTasks] = useState<BreakdownSlice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || tasks) return; // busca uma vez por expansão
    let alive = true;
    setLoading(true);
    setError("");
    API.cfBreakdown({ start: day, end: day })
      .then((r) => {
        if (!alive) return;
        setTasks(r.breakdown?.byTask ?? []);
        setError(r.error || "");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "erro ao carregar tarefas");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);

  return { tasks, loading, error };
}
