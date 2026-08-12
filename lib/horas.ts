// Lógica de saldo do banco de horas — funções puras (sem DOM), portadas de
// public/index.html. Recebem o `state` e o dia de hoje ("AAAA-MM-DD") em vez
// de depender de globais. `DAY` (meta diária) vem sempre de state.metaDiaSec.
import type { Jornada, MesFechado, State } from "@/types";

export const SEMANAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * Vigência de jornada aplicável a um dia ("AAAA-MM-DD"): a última cujo
 * `desde <= dia`. Antes da primeira vigência, extrapola a primeira para trás.
 * Cai no espelho `metaDiaSec`/`diasSemana` se `jornadas` estiver ausente
 * (estado legado ainda não migrado).
 */
export function jornadaDe(state: State, s: string): Jornada {
  const js = state.jornadas;
  if (js && js.length) {
    let pick = js[0];
    for (const j of js) if (j.desde <= s) pick = j; // js ordenado por desde asc
    return pick;
  }
  return {
    desde: "0000-01-01",
    metaDiaSec: state.metaDiaSec || 28800,
    diasSemana: state.diasSemana?.length ? state.diasSemana : [1, 2, 3, 4, 5],
  };
}

/** Meta diária (segundos) vigente no dia `s`. */
function DAY(state: State, s: string): number {
  return jornadaDe(state, s).metaDiaSec || 28800;
}
/** Dias trabalhados vigentes no dia `s`. */
function diasSemanaDe(state: State, s: string): number[] {
  const d = jornadaDe(state, s).diasSemana;
  return d?.length ? d : [1, 2, 3, 4, 5];
}

/* ---- tempo ---- */
export function toHMS(sec: number): string {
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(ss).padStart(2, "0")
  );
}

export function signed(sec: number, withSec = true): string {
  const sign = sec > 0 ? "+" : sec < 0 ? "−" : "±";
  const abs = Math.abs(Math.round(sec));
  if (withSec) return sign + toHMS(abs);
  const h = Math.floor(abs / 3600),
    m = Math.floor((abs % 3600) / 60);
  return sign + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function cls(sec: number): "pos" | "neg" | "zero" {
  return sec > 0 ? "pos" : sec < 0 ? "neg" : "zero";
}

/** Classe de cor (definida em globals.css) para valores de saldo. */
export function saldoColor(sec: number): string {
  return sec > 0 ? "saldo-pos" : sec < 0 ? "saldo-neg" : "saldo-zero";
}

/* ---- datas ---- */
export function ymd(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function parseD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}
export function isFeriado(state: State, s: string): boolean {
  return !!state.feriados[s];
}
/** Dia de férias — não conta meta nem gera débito (como um feriado pessoal). */
export function isFerias(state: State, s: string): boolean {
  return !!state.ferias?.[s];
}
export function isUtil(state: State, s: string): boolean {
  return (
    diasSemanaDe(state, s).includes(parseD(s).getDay()) &&
    !isFeriado(state, s) &&
    !isFerias(state, s)
  );
}
export function metaDia(state: State, s: string): number {
  return isUtil(state, s) ? DAY(state, s) : 0;
}
/** Horas de atestado creditadas no dia (segundos). */
export function atestadoDe(state: State, s: string): number {
  return state.atestados?.[s] ?? 0;
}
/** Meta do dia já descontando o atestado (nunca negativa). */
export function metaEfetiva(state: State, s: string): number {
  return Math.max(0, metaDia(state, s) - atestadoDe(state, s));
}
/**
 * Jornada semanal derivada (meta diária × dias trabalhados) da vigência que
 * cobre `ref` (default: a última vigência conhecida).
 */
export function jornadaSemana(state: State, ref?: string): number {
  const j = jornadaDe(state, ref ?? "9999-12-31");
  const n = j.diasSemana?.length ? j.diasSemana.length : 5;
  return (j.metaDiaSec || 28800) * n;
}

/** Distância em metros entre dois pontos (haversine) — usada no check-in GPS. */
export function distMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function diasDoMes(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const arr: string[] = [];
  for (let i = 1; i <= last; i++) arr.push(ym + "-" + String(i).padStart(2, "0"));
  return arr;
}
export function diasUteisMes(state: State, ym: string): number {
  return diasDoMes(ym).filter((d) => isUtil(state, d)).length;
}
/**
 * Meta do mês (segundos) somando a meta de cada dia útil — respeita jornada que
 * muda no meio do mês (ex.: virada de vigência). Substitui o antigo
 * `diasÚteis × metaDiaSec`.
 */
export function metaMesSec(state: State, ym: string): number {
  return diasDoMes(ym).reduce((a, d) => a + metaDia(state, d), 0);
}

/* ---- saldos ---- */
export function fechadoMeta(state: State, f: MesFechado): number {
  // Meta congelada no fechamento; se ausente (fechado antigo), deriva pela
  // jornada vigente no início daquele mês — nunca pela jornada de hoje.
  if (typeof f.metaSec === "number") return f.metaSec;
  return f.dias * DAY(state, f.ym + "-01");
}
export function fechadoSaldo(state: State, f: MesFechado): number {
  return f.trab - fechadoMeta(state, f);
}
export function mesConhecidoList(state: State): string[] {
  const set = new Set(state.fechados.map((f) => f.ym));
  Object.keys(state.registros).forEach((d) => set.add(d.slice(0, 7)));
  return [...set].sort();
}
// dias que entram no saldo do mês: os LANÇADOS + os dias úteis que já
// passaram (mesmo sem lançamento -> contam como -meta de débito). Hoje e o
// futuro só contam se você lançou.
export function diasContabilizados(state: State, ym: string, hoje: string): string[] {
  const set = new Set(
    Object.keys(state.registros).filter((d) => d.startsWith(ym)),
  );
  for (const d of diasDoMes(ym)) if (isUtil(state, d) && d < hoje) set.add(d);
  return [...set].sort();
}
export function saldoMes(state: State, ym: string, hoje: string): number {
  const f = state.fechados.find((x) => x.ym === ym);
  if (f) return fechadoSaldo(state, f);
  let s = 0;
  for (const d of diasContabilizados(state, ym, hoje))
    s += (state.registros[d] || 0) - metaEfetiva(state, d);
  return s;
}
export function saldoGeral(state: State, hoje: string): number {
  return mesConhecidoList(state).reduce((a, ym) => a + saldoMes(state, ym, hoje), 0);
}
export function carryIn(state: State, ym: string, hoje: string): number {
  return mesConhecidoList(state)
    .filter((m) => m < ym)
    .reduce((a, m) => a + saldoMes(state, m, hoje), 0);
}

/* ---- helpers de intervalo (dialogs de import) ---- */
export function addDays(s: string, n: number): string {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function mondayOf(s: string): string {
  const d = parseD(s);
  const w = d.getDay();
  d.setDate(d.getDate() + (w === 0 ? -6 : 1 - w));
  return ymd(d);
}
/** Lista todos os dias ("AAAA-MM-DD") do intervalo [de, ate] inclusivo. */
export function rangeDias(de: string, ate: string): string[] {
  if (de > ate) [de, ate] = [ate, de];
  const out: string[] = [];
  for (let d = de; d <= ate; d = addDays(d, 1)) out.push(d);
  return out;
}
/** Agrupa datas soltas em períodos contíguos {de, ate} (ordenados). */
export function agruparPeriodos(dates: string[]): { de: string; ate: string }[] {
  const sorted = [...new Set(dates)].sort();
  const out: { de: string; ate: string }[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && addDays(last.ate, 1) === d) last.ate = d;
    else out.push({ de: d, ate: d });
  }
  return out;
}
export function monthRangeYM(ym: string): [string, string] {
  const ds = diasDoMes(ym);
  return [ds[0], ds[ds.length - 1]];
}
export function shiftYM(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  return y + "-" + String(m).padStart(2, "0");
}
export function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  if (m < 1) {
    m = 12;
    y--;
  }
  if (m > 12) {
    m = 1;
    y++;
  }
  return y + "-" + String(m).padStart(2, "0");
}
export function dm(s: string): string {
  const [, mm, dd] = s.split("-");
  return dd + "/" + mm;
}
export function fmtJornada(sec: number): string {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/* ---- parsing de tempo (campos h:m:s) ---- */
export function hmsToSec(h: string, m: string, s: string): number {
  return (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0);
}

export function secToHMSParts(sec: number): [string, string, string] {
  const s = Math.abs(Math.round(sec));
  return [
    String(Math.floor(s / 3600)).padStart(2, "0"),
    String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
    String(s % 60).padStart(2, "0"),
  ];
}

/** "8:30" / "83000" / "08:30:00" -> [hh, mm, ss] (ou null se não der p/ parsear). */
export function parseTimeString(str: string): [string, string, string] | null {
  const clean = String(str).trim();
  if (!clean) return null;
  let h = 0,
    m = 0,
    s = 0;
  if (clean.includes(":")) {
    const p = clean.split(":").map((x) => parseInt(x, 10) || 0);
    if (p.length >= 3) [h, m, s] = [p[0], p[1], p[2]];
    else if (p.length === 2) [h, m] = [p[0], p[1]];
    else h = p[0];
  } else {
    const d = clean.replace(/\D/g, "");
    if (d.length <= 2) return null;
    s = +d.slice(-2);
    m = +(d.slice(-4, -2) || 0);
    h = +(d.slice(0, -4) || 0);
  }
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ];
}
