"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { State } from "@/types";
import { API, ApiError } from "@/lib/api";

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
    try {
      await API.putState(dbRef.current as State);
      setSaveStatus("ok");
    } catch (e) {
      dirtyRef.current = true;
      setSaveStatus("error");
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
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
