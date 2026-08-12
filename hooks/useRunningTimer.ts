"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RunningEntry } from "@/types";
import { API, ApiError } from "@/lib/api";

const POLL_MS = 30000; // re-checa o Clockify a cada 30s (detecta start/stop/troca)
const TICK_MS = 1000; // atualiza o decorrido a cada 1s no cliente

/**
 * Observa o cronômetro em andamento no Clockify (SOMENTE LEITURA): faz polling
 * do backend e mantém o "decorrido" vivo no cliente (tick de 1s), corrigindo o
 * clock skew do navegador com o `serverNow` retornado. Pausa quando a aba está
 * oculta e re-checa ao voltar o foco.
 */
export function useRunningTimer(enabled: boolean, onUnauthorized?: () => void) {
  const [running, setRunning] = useState<RunningEntry | null>(null);
  const [error, setError] = useState("");
  // now (ms) já ajustado pelo offset servidor↔cliente; alimenta o cálculo do decorrido.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const offsetRef = useRef(0); // serverNow - Date.now() no último fetch
  const onUnauthRef = useRef(onUnauthorized);
  useEffect(() => {
    onUnauthRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const poll = useCallback(async () => {
    try {
      const r = await API.cfRunning();
      offsetRef.current = r.serverNow - Date.now();
      setRunning(r.running);
      setError(r.error || "");
      setNowMs(Date.now() + offsetRef.current);
      return r.running;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthRef.current?.();
      setError(e instanceof Error ? e.message : "erro ao ler o cronômetro");
      return null;
    }
  }, []);

  // Polling — só quando habilitado e a aba visível.
  useEffect(() => {
    if (!enabled) {
      setRunning(null);
      setError("");
      return;
    }
    let alive = true;
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id) return;
      void poll();
      id = setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          void poll();
        }
      }, POLL_MS);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    const onVisibility = () => {
      if (!alive) return;
      if (document.visibilityState === "visible") {
        void poll(); // re-checa imediatamente ao voltar
        start();
      } else {
        stop();
      }
    };

    start();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", onVisibility);
    }
    return () => {
      alive = false;
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", onVisibility);
      }
    };
  }, [enabled, poll]);

  // Tick de 1s — só quando há timer rodando.
  useEffect(() => {
    if (!running) return;
    setNowMs(Date.now() + offsetRef.current);
    const id = setInterval(() => setNowMs(Date.now() + offsetRef.current), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const elapsedSec = running
    ? Math.max(0, Math.round((nowMs - Date.parse(running.start)) / 1000))
    : 0;

  return { running, elapsedSec, error, refresh: poll };
}
