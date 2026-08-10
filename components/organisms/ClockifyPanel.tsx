"use client";

import { useState } from "react";
import type { MeResponse } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Ações rápidas do Clockify no trilho (somente leitura). */
export function ClockifyPanel({
  me,
  onSyncToday,
  onOpenImport,
  onOpenClockify,
}: {
  me: MeResponse;
  onSyncToday: () => Promise<void>;
  onOpenImport: () => void;
  onOpenClockify: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const configured = me.clockify.configured;

  async function doSync() {
    setSyncing(true);
    try {
      await onSyncToday();
    } catch (e) {
      alert("Não consegui sincronizar hoje:\n" + (e instanceof Error ? e.message : ""));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="eyebrow">Clockify</span>
      {configured ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-credit" />
            <span className="truncate text-muted-foreground">
              {me.clockify.name || me.clockify.email || "conectado"}
            </span>
          </div>
          <div className="grid gap-2">
            <Button variant="secondary" size="sm" onClick={doSync} disabled={syncing}>
              {syncing ? "sincronizando…" : "Sincronizar hoje"}
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenImport}>
              Importar período
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Conecte para importar suas horas automaticamente.
          </p>
          <Button size="sm" onClick={onOpenClockify}>
            Conectar Clockify
          </Button>
        </>
      )}
    </Card>
  );
}
