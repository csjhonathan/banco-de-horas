"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EscritorioConfig, Jornada, MeResponse, State } from "@/types";
import { distMeters, jornadaDe, rangeDias, ymd } from "@/lib/horas";
import { normalizeJornadas } from "@/lib/seed";

export type CheckInResult =
  | { ok: true; withinRadius: boolean; distance: number }
  | { ok: false; error: string };
import { API, ApiError, type CfConfigResult, type SyncResult } from "@/lib/api";
import { usePersistence } from "./usePersistence";
import { useAutoRefresh } from "./useAutoRefresh";

const HOJE = ymd(new Date());
const REFRESH_MS = 60000;

/**
 * Estado central do banco de horas: usuário, estado persistido (via
 * usePersistence), mutações, sync com o Clockify e auto-refresh. Concentra a
 * lógica para manter os componentes burros.
 */
export function useBancoDeHoras() {
  const router = useRouter();

  const handle401 = useCallback(() => {
    router.push("/login");
  }, [router]);

  const { db, dbRef, dirtyRef, persistingRef, saveStatus, commit, replaceFromServer } =
    usePersistence(handle401);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [viewYM, setViewYM] = useState(HOJE.slice(0, 7));
  const [bootError, setBootError] = useState("");

  const meRef = useRef<MeResponse | null>(null);
  const busyRef = useRef(false); // usuário digitando no formulário
  const dialogsRef = useRef(false); // algum diálogo aberto
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  /* ---- mutações ---- */
  const setRegistro = useCallback(
    (day: string, sec: number) => {
      const cur = dbRef.current!;
      commit({ ...cur, registros: { ...cur.registros, [day]: sec } });
    },
    [commit, dbRef],
  );
  const deleteRegistro = useCallback(
    (day: string) => {
      const cur = dbRef.current!;
      const registros = { ...cur.registros };
      delete registros[day];
      commit({ ...cur, registros });
    },
    [commit, dbRef],
  );
  const setFeriado = useCallback(
    (day: string, name: string) => {
      const cur = dbRef.current!;
      commit({ ...cur, feriados: { ...cur.feriados, [day]: name } });
    },
    [commit, dbRef],
  );
  const deleteFeriado = useCallback(
    (day: string) => {
      const cur = dbRef.current!;
      const feriados = { ...cur.feriados };
      delete feriados[day];
      commit({ ...cur, feriados });
    },
    [commit, dbRef],
  );
  const setJornadas = useCallback(
    (jornadas: Jornada[]) => {
      const cur = dbRef.current!;
      const fallback: Jornada = {
        desde: "0000-01-01",
        metaDiaSec: cur.metaDiaSec,
        diasSemana: cur.diasSemana,
      };
      const norm = normalizeJornadas(jornadas, fallback);
      // espelho = vigência que cobre hoje (jornada "atual").
      const atual = jornadaDe({ ...cur, jornadas: norm }, HOJE);
      commit({
        ...cur,
        jornadas: norm,
        metaDiaSec: atual.metaDiaSec,
        diasSemana: [...atual.diasSemana],
      });
    },
    [commit, dbRef],
  );
  const setAtestado = useCallback(
    (day: string, sec: number) => {
      const cur = dbRef.current!;
      const atestados = { ...cur.atestados };
      if (sec > 0) atestados[day] = sec;
      else delete atestados[day];
      commit({ ...cur, atestados });
    },
    [commit, dbRef],
  );
  const togglePresencial = useCallback(
    (day: string) => {
      const cur = dbRef.current!;
      const presencial = { ...cur.presencial };
      if (presencial[day]) delete presencial[day];
      else presencial[day] = true;
      commit({ ...cur, presencial });
    },
    [commit, dbRef],
  );
  const setPresencial = useCallback(
    (day: string, val: boolean) => {
      const cur = dbRef.current!;
      const presencial = { ...cur.presencial };
      if (val) presencial[day] = true;
      else delete presencial[day];
      commit({ ...cur, presencial });
    },
    [commit, dbRef],
  );
  const addFerias = useCallback(
    (de: string, ate: string) => {
      const cur = dbRef.current!;
      const ferias = { ...cur.ferias };
      for (const d of rangeDias(de, ate)) ferias[d] = true;
      commit({ ...cur, ferias });
    },
    [commit, dbRef],
  );
  const removeFerias = useCallback(
    (de: string, ate: string) => {
      const cur = dbRef.current!;
      const ferias = { ...cur.ferias };
      for (const d of rangeDias(de, ate)) delete ferias[d];
      commit({ ...cur, ferias });
    },
    [commit, dbRef],
  );
  const setEscritorio = useCallback(
    (esc: EscritorioConfig | null) => {
      const cur = dbRef.current!;
      commit({ ...cur, escritorio: esc });
    },
    [commit, dbRef],
  );
  const checkIn = useCallback(async (): Promise<CheckInResult> => {
    const esc = dbRef.current?.escritorio;
    if (!esc) return { ok: false, error: "Configure o local do escritório primeiro." };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { ok: false, error: "Geolocalização indisponível neste navegador." };
    }
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }),
      );
      const dist = distMeters(pos.coords.latitude, pos.coords.longitude, esc.lat, esc.lng);
      const within = dist <= Math.max(150, esc.raioM); // 150m mínimo (precisão do GPS)
      if (within) setPresencial(HOJE, true);
      return { ok: true, withinRadius: within, distance: Math.round(dist) };
    } catch {
      return { ok: false, error: "Não consegui obter sua localização (permissão negada?)." };
    }
  }, [dbRef, setPresencial]);
  const recalibrar = useCallback(
    (ym: string, dias: number, trab: number) => {
      const cur = dbRef.current!;
      commit({
        ...cur,
        fechados: cur.fechados.map((f) => (f.ym === ym ? { ...f, dias, trab } : f)),
      });
    },
    [commit, dbRef],
  );

  /* ---- Clockify sync ---- */
  // Import SUBSTITUTIVO: o banco passa a conter somente a janela [start, end].
  const importRange = useCallback(
    async (start: string, end: string): Promise<SyncResult> => {
      const res = await API.cfImport({ start, end });
      replaceFromServer(res.state);
      return res;
    },
    [replaceFromServer],
  );
  const syncToday = useCallback(async () => {
    const res = await API.cfSync({ start: HOJE, end: HOJE });
    replaceFromServer(res.state);
  }, [replaceFromServer]);

  const applyClockify = useCallback((cfg: CfConfigResult) => {
    setMe((prev) => (prev ? { ...prev, clockify: cfg } : prev));
  }, []);

  /* ---- boot ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await API.me();
        if (!alive) return;
        setMe(m);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) handle401();
        return;
      }
      try {
        const s = await API.getState();
        if (!alive) return;
        replaceFromServer(s);
        setViewYM(HOJE.slice(0, 7));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return handle401();
        setBootError(e instanceof Error ? e.message : "erro ao carregar");
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle401, replaceFromServer]);

  /* ---- auto-refresh ---- */
  const canRun = useCallback(() => {
    if (!dbRef.current || dirtyRef.current || persistingRef.current) return false;
    if (busyRef.current || dialogsRef.current) return false;
    if (typeof window !== "undefined" && window.getSelection && String(window.getSelection()))
      return false;
    return true;
  }, [dbRef, dirtyRef, persistingRef]);

  useAutoRefresh({
    intervalMs: REFRESH_MS,
    canRun,
    onTick: async () =>
      meRef.current?.clockify.configured
        ? (await API.cfSync({ start: HOJE, end: HOJE })).state
        : await API.getState(),
    getCurrent: () => dbRef.current,
    onState: replaceFromServer,
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) handle401();
    },
  });

  return {
    HOJE,
    me,
    db,
    dbRef,
    viewYM,
    setViewYM,
    saveStatus,
    ready: !!(db && me),
    bootError,
    setBusy: (b: boolean) => {
      busyRef.current = b;
    },
    setDialogsOpen: (b: boolean) => {
      dialogsRef.current = b;
    },
    handle401,
    replaceFromServer,
    setRegistro,
    deleteRegistro,
    setFeriado,
    deleteFeriado,
    setJornadas,
    setAtestado,
    togglePresencial,
    setPresencial,
    addFerias,
    removeFerias,
    setEscritorio,
    checkIn,
    recalibrar,
    importRange,
    syncToday,
    applyClockify,
  };
}

export type BancoDeHoras = ReturnType<typeof useBancoDeHoras>;
