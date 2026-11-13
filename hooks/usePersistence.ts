"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { State } from "@/types";
import { API, ApiError } from "@/lib/api";
import { rebaseState } from "@/lib/rebase";

export type SaveStatus = "" | "saving" | "ok" | "error";

/**
 * Motor de persistência otimista com debounce (mesmo comportamento do app
 * original): `commit` aplica uma mudança do usuário e agenda o save;
 * `replaceFromServer` troca o estado sem re-salvar (sync/auto-refresh).
 */
export function usePersistence(onUnauthorized: () => void) {
  const [db, setDb] = useState<State | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("");

  const dbRef = useRef<State | null>(null);
  /** Último estado CONFIRMADO pelo servidor — base da junção num 409. */
  const baseRef = useRef<State | null>(null);
  /** Conflitos seguidos (freio contra laço se algo grava sem parar). */
  const conflictsRef = useRef(0);
  const dirtyRef = useRef(false);
  const persistingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});

  const scheduleFlush = useCallback(() => {
    dirtyRef.current = true;
    if (timer.current) return;
    timer.current = setTimeout(() => flushRef.current(), 350);
  }, []);

  const flush = useCallback(async () => {
    timer.current = null;
    if (persistingRef.current) {
      scheduleFlush();
      return;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    persistingRef.current = true;
    setSaveStatus("saving");
    const sent = dbRef.current as State;
    try {
      const saved = await API.putState(sent);
      conflictsRef.current = 0;
      baseRef.current = saved;
      // Edições feitas durante o save seguem locais; só a versão avança.
      dbRef.current = dbRef.current === sent ? saved : { ...(dbRef.current as State), rev: saved.rev };
      setSaveStatus("ok");
    } catch (e) {
      dirtyRef.current = true;
      if (e instanceof ApiError && e.status === 409 && e.body?.state && conflictsRef.current < 5) {
        // Alguém gravou antes (MCP, sync, outra aba): reaplica as mudanças da
        // tela por cima do servidor e tenta de novo, sem perder nenhum dos dois.
        conflictsRef.current++;
        const server = e.body.state as State;
        const merged = rebaseState(baseRef.current ?? server, dbRef.current as State, server);
        baseRef.current = server;
        dbRef.current = merged;
        setDb(merged);
      } else {
        setSaveStatus("error");
        if (e instanceof ApiError && e.status === 401) onUnauthorized();
      }
    } finally {
      persistingRef.current = false;
      if (dirtyRef.current) scheduleFlush();
    }
  }, [scheduleFlush, onUnauthorized]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const commit = useCallback(
    (next: State) => {
      dbRef.current = next;
      setDb(next);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const replaceFromServer = useCallback((next: State) => {
    baseRef.current = next;
    dbRef.current = next;
    setDb(next);
  }, []);

  return {
    db,
    dbRef,
    dirtyRef,
    persistingRef,
    saveStatus,
    commit,
    replaceFromServer,
  };
}
