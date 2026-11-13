// Contexto das ferramentas do MCP: o estado do usuário + uma camada AO VIVO do
// Clockify (mês corrente em merge + cronômetro rodando), montada SÓ EM MEMÓRIA.
// O MCP nunca grava nada — nem no app, nem no Clockify.
import { getUser } from "@/lib/db";
import { migrate, seed } from "@/lib/seed";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { signed, toHMS } from "@/lib/horas";
import type { RunningEntry, State, UserDoc } from "@/types";

export const TZ = process.env.DEFAULT_TZ || "America/Sao_Paulo";

export interface Contexto {
  user: UserDoc;
  /** Estado salvo + o mês corrente do Clockify (merge, como o /sync) — SEM o cronômetro. */
  state: State;
  /** `state` + o decorrido do cronômetro somado em hoje (o que o Hero mostra). */
  live: State;
  hoje: string;
  clockifyOn: boolean;
  running: RunningEntry | null;
  /** De onde vieram os números (pro modelo saber o quão frescos estão). */
  fonte: string;
  aviso?: string;
}

export function hojeLocal(): string {
  return clockify.localDate(new Date().toISOString(), TZ);
}

/** Duração (segundos) → "HH:MM". */
export function hm(sec: number): string {
  return toHMS(sec).slice(0, -3); // tira ":SS" (horas podem ter 3+ dígitos)
}
/** Saldo (segundos) → "+HH:MM" / "−HH:MM" / "±00:00". */
export function saldo(sec: number): string {
  return signed(sec, false);
}

export async function carregarContexto(username: string, opts: { aoVivo?: boolean } = {}): Promise<Contexto> {
  const user = await getUser(username);
  if (!user) throw new Error("Usuário não encontrado.");
  const state: State = structuredClone(user.data ?? seed());
  migrate(state);
  const hoje = hojeLocal();
  const clockifyOn = !!user.clockify?.apiKey;

  let running: RunningEntry | null = null;
  let fonte = clockifyOn ? "dados salvos no app" : "lançamentos manuais (Clockify não conectado)";
  let aviso: string | undefined;

  if (clockifyOn && opts.aoVivo !== false) {
    const creds = credsFrom(user);
    const [mes, timer] = await Promise.allSettled([
      clockify.syncRange(creds, { start: `${hoje.slice(0, 7)}-01`, end: hoje }),
      clockify.runningEntry(creds),
    ]);
    if (mes.status === "fulfilled") {
      // Merge-only, igual ao /sync: sobrescreve só os dias que o Clockify devolveu.
      for (const [d, sec] of Object.entries(mes.value.registros)) state.registros[d] = sec;
      fonte = "Clockify ao vivo (mês atual) + dados salvos no app";
    } else {
      aviso = `Não consegui ler o Clockify agora (${errMsg(mes.reason)}); usei os dados salvos no app.`;
    }
    if (timer.status === "fulfilled") running = timer.value;
  }

  const live: State =
    running && running.elapsedSec > 0
      ? { ...state, registros: { ...state.registros, [hoje]: (state.registros[hoje] || 0) + running.elapsedSec } }
      : state;

  return { user, state, live, hoje, clockifyOn, running, fonte, aviso };
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
