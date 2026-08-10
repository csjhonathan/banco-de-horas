"use client";

import { useEffect } from "react";
import type { State } from "@/types";

/**
 * Auto-refresh encadeado (setTimeout sem sobreposição): a cada `intervalMs`,
 * se `canRun()` permitir, busca o estado via `onTick` e aplica com `onState`
 * apenas se mudou. Reagenda só depois da resposta.
 */
export function useAutoRefresh({
  intervalMs,
  canRun,
  onTick,
  getCurrent,
  onState,
  onError,
}: {
  intervalMs: number;
  canRun: () => boolean;
  onTick: () => Promise<State>;
  getCurrent: () => State | null;
  onState: (s: State) => void;
  onError: (e: unknown) => void;
}) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function tick() {
      if (canRun()) {
        try {
          const s = await onTick();
          if (!cancelled && canRun() && JSON.stringify(s) !== JSON.stringify(getCurrent())) {
            onState(s);
          }
        } catch (e) {
          onError(e);
        }
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    }

    timer = setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);
}
