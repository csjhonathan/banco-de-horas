// Reaplica as mudanças locais (da tela) por cima do estado do servidor quando
// o save dá 409 (o MCP, o sync ou outra aba gravaram antes). Junção de três
// vias, campo a campo — função pura:
//  - mapas por dia (registros, feriados, atestados, presencial, férias): só as
//    CHAVES que a tela mudou desde `base` vencem; o resto fica como o servidor.
//  - demais campos (jornadas, fechados, escritório, início do banco…): se a
//    tela mudou o campo, vale o da tela; senão, o do servidor.
import type { State } from "@/types";

const MAPAS = ["registros", "feriados", "atestados", "presencial", "ferias"] as const;

type Mapa = Record<string, unknown>;

export function rebaseState(base: State, local: State, server: State): State {
  const out = structuredClone(server) as unknown as Record<string, unknown>;
  const b = base as unknown as Record<string, unknown>;
  const l = local as unknown as Record<string, unknown>;

  for (const campo of MAPAS) {
    const bm = (b[campo] ?? {}) as Mapa;
    const lm = (l[campo] ?? {}) as Mapa;
    const om = { ...((out[campo] ?? {}) as Mapa) };
    for (const k of new Set([...Object.keys(bm), ...Object.keys(lm)])) {
      if (JSON.stringify(bm[k]) === JSON.stringify(lm[k])) continue; // a tela não mexeu
      if (k in lm) om[k] = lm[k];
      else delete om[k];
    }
    out[campo] = om;
  }

  const outros = new Set([...Object.keys(b), ...Object.keys(l)]);
  for (const campo of outros) {
    if ((MAPAS as readonly string[]).includes(campo) || campo === "rev") continue;
    if (JSON.stringify(b[campo]) !== JSON.stringify(l[campo])) out[campo] = structuredClone(l[campo]);
  }

  out.rev = server.rev;
  return out as unknown as State;
}
