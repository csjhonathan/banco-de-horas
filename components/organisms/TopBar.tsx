"use client";

import type { MeResponse, State } from "@/types";
import type { SaveStatus } from "@/hooks/usePersistence";
import { Button } from "@/components/ui/button";
import { SaveIndicator } from "@/components/molecules/SaveIndicator";
import { UserChip } from "@/components/molecules/UserChip";
import { JornadaLabel } from "@/components/molecules/JornadaLabel";

export function TopBar({
  me,
  db,
  saveStatus,
  onOpenJornada,
  onOpenClockify,
  onExport,
  onImport,
  onReset,
  onLogout,
}: {
  me: MeResponse;
  db: State;
  saveStatus: SaveStatus;
  onOpenJornada: () => void;
  onOpenClockify: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h1 className="text-[15px] font-bold uppercase tracking-[0.14em]">Banco de Horas</h1>
        <JornadaLabel metaDiaSec={db.metaDiaSec} onClick={onOpenJornada} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SaveIndicator status={saveStatus} />
        <UserChip username={me.username} />
        <Button variant="accent" size="sm" onClick={onOpenClockify}>
          Clockify
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          Backup
        </Button>
        <Button variant="outline" size="sm" onClick={onImport}>
          Importar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="hover:border-destructive hover:text-destructive"
        >
          Reiniciar
        </Button>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
