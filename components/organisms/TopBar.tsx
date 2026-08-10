"use client";

import type { MeResponse, State } from "@/types";
import type { SaveStatus } from "@/hooks/usePersistence";
import { Button } from "@/components/ui/button";
import { SaveIndicator } from "@/components/molecules/SaveIndicator";
import { JornadaLabel } from "@/components/molecules/JornadaLabel";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { Logo } from "@/components/molecules/Logo";

export function TopBar({
  me,
  db,
  saveStatus,
  onOpenJornada,
  onOpenClockify,
  onLogout,
}: {
  me: MeResponse;
  db: State;
  saveStatus: SaveStatus;
  onOpenJornada: () => void;
  onOpenClockify: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-3">
        <Logo markSize={28} />
        <span className="hidden h-4 w-px bg-border sm:block" />
        <JornadaLabel
          metaDiaSec={db.metaDiaSec}
          diasCount={db.diasSemana?.length ?? 5}
          onClick={onOpenJornada}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <SaveIndicator status={saveStatus} />
        <Button variant="secondary" size="sm" onClick={onOpenClockify}>
          Clockify
        </Button>
        <ThemeToggle />
        <span className="hidden px-1 text-sm text-muted-foreground sm:inline">@{me.username}</span>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
          Sair
        </Button>
      </div>
    </header>
  );
}
