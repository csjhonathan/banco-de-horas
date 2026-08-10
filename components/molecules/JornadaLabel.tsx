"use client";

import { fmtJornada } from "@/lib/horas";

/** Rótulo clicável da jornada (abre o diálogo de jornada). */
export function JornadaLabel({
  metaDiaSec,
  onClick,
}: {
  metaDiaSec: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title="Editar jornada"
      className="border-b border-dashed border-border pb-px text-xs text-faint hover:border-accent hover:text-accent"
    >
      {fmtJornada(metaDiaSec)}/dia · {fmtJornada(metaDiaSec * 5)}/semana
    </button>
  );
}
