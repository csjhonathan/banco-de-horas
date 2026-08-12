// Cores dos gráficos. Paleta categórica validada (dataviz) exposta como CSS vars
// (--cat-1..8, definidas em globals.css p/ claro e escuro). Barras/fatias de
// PROJETO usam a cor do próprio Clockify (identidade); onde não há cor da fonte
// (cliente/tarefa), caímos na paleta categórica por ordem (rank).
import type { BreakdownSlice } from "@/types";

export const CAT_LEN = 8;

/** Cor CSS de uma fatia: cor do Clockify se houver, senão o slot categórico. */
export function sliceColor(item: BreakdownSlice, index: number): string {
  const c = item.color?.trim();
  if (c) return c;
  return `var(--cat-${(index % CAT_LEN) + 1})`;
}

/** Cor neutra p/ a fatia "Outros" (agregado da cauda). */
export const OTHER_COLOR = "hsl(var(--muted-foreground))";
