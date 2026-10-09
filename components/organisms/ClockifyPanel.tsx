"use client";

import type { MeResponse } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Ações rápidas do Clockify no trilho (somente leitura).
 * O sync de um dia vive em cada linha da tabela (`DayRow`), não aqui.
 */
export function ClockifyPanel({
  me,
  onOpenImport,
  onOpenClockify,
}: {
  me: MeResponse;
  onOpenImport: () => void;
  onOpenClockify: () => void;
}) {
  const configured = me.clockify.configured;

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
          <Button variant="secondary" size="sm" onClick={onOpenImport}>
            Importar período
          </Button>
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
