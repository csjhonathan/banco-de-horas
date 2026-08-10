"use client";

import { fmtJornada } from "@/lib/horas";

/** Rótulo clicável da jornada (abre o diálogo de jornada). */
export function JornadaLabel({
  metaDiaSec,
  diasCount,
  onClick,
}: {
  metaDiaSec: number;
  diasCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title="Editar jornada"
      className="text-left text-xs text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
    >
      {fmtJornada(metaDiaSec)}/dia · {fmtJornada(metaDiaSec * diasCount)}/semana
    </button>
  );
}
