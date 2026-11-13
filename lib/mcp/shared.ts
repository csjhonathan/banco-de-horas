// Tipos e helpers comuns às ferramentas do MCP (leitura e escrita).
import { MESES, SEMANAS, antesDoInicio, isFerias, isUtil, parseD } from "@/lib/horas";
import type { State } from "@/types";
import type { Quem } from "./acoes";

export type { Quem };

export interface McpTool {
  name: string;
  title: string;
  /** read = só consulta; write = propõe uma mudança que só grava com confirmar_acao. */
  kind: "read" | "write";
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run(args: Record<string, unknown>, quem: Quem): Promise<unknown>;
}

/** Erro de entrada: vira `isError` com a mensagem pro modelo corrigir. */
export class ToolInputError extends Error {}

export const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const RE_MES = /^\d{4}-\d{2}$/;

/** "AAAA-MM-DD" válido de verdade (não aceita 2026-02-31). */
export function diaValido(v: string): boolean {
  if (!RE_DIA.test(v)) return false;
  const d = parseD(v);
  return d.getFullYear() === +v.slice(0, 4) && d.getMonth() + 1 === +v.slice(5, 7) && d.getDate() === +v.slice(8, 10);
}

export function argDia(args: Record<string, unknown>, key: string, fallback?: string): string {
  const v = args[key];
  if (v === undefined || v === null || v === "") {
    if (fallback !== undefined) return fallback;
    throw new ToolInputError(`Informe "${key}" (AAAA-MM-DD).`);
  }
  if (typeof v !== "string" || !diaValido(v)) throw new ToolInputError(`"${key}" deve ser uma data AAAA-MM-DD válida.`);
  return v;
}

export function argMes(args: Record<string, unknown>, key: string, fallback?: string): string | undefined {
  const v = args[key];
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v !== "string" || !RE_MES.test(v)) throw new ToolInputError(`"${key}" deve ser AAAA-MM.`);
  return v;
}

export const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
export const diaSemana = (d: string) => SEMANAS[parseD(d).getDay()];

/** Por que um dia não é útil (ou "útil"). */
export function tipoDoDia(state: State, d: string): string {
  if (antesDoInicio(state, d)) return "antes do início do contrato";
  if (state.feriados[d]) return `feriado: ${state.feriados[d]}`;
  if (isFerias(state, d)) return "férias";
  if (!isUtil(state, d)) return "folga (dia fora da jornada)";
  return "útil";
}
