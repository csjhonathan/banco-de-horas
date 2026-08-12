"use client";

import { useEffect, useState } from "react";
import type { Breakdown } from "@/types";
import { API, ApiError } from "@/lib/api";

/**
 * Busca o relatório por projeto/cliente/tarefa no período [start, end].
 * Só busca quando `enabled` (ex.: accordion aberto) e refaz quando o período
 * muda. SOMENTE LEITURA.
 */
export function useBreakdown(
  enabled: boolean,
  start: string,
  end: string,
  onUnauthorized?: () => void,
) {
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !start || !end) return;
    let alive = true;
    setLoading(true);
    setError("");
    API.cfBreakdown({ start, end })
      .then((r) => {
        if (!alive) return;
        setData(r.breakdown);
        setError(r.error || "");
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) onUnauthorized?.();
        setError(e instanceof Error ? e.message : "erro ao gerar o relatório");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, start, end]);

  return { data, loading, error };
}
