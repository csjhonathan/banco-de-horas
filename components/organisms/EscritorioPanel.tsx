"use client";

import { useState } from "react";
import type { State } from "@/types";
import type { CheckInResult } from "@/hooks/useBancoDeHoras";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EscritorioPanel({
  db,
  hoje,
  onCheckIn,
  onOpenEscritorio,
  setPresencial,
}: {
  db: State;
  hoje: string;
  onCheckIn: () => Promise<CheckInResult>;
  onOpenEscritorio: () => void;
  setPresencial: (day: string, val: boolean) => void;
}) {
  const esc = db.escritorio;
  const presenteHoje = !!db.presencial[hoje];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean; outside?: boolean } | null>(null);

  async function doCheckIn() {
    setBusy(true);
    setMsg(null);
    const r = await onCheckIn();
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, ok: false });
    if (r.withinRadius) {
      setMsg({ text: `Presença registrada · ${r.distance}m do escritório.`, ok: true });
    } else {
      setMsg({
        text: `Você está a ${r.distance}m (fora do raio de ${esc?.raioM}m).`,
        ok: false,
        outside: true,
      });
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Presença</span>
        {esc && (
          <button
            onClick={onOpenEscritorio}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            editar local
          </button>
        )}
      </div>

      {!esc ? (
        <>
          <p className="text-sm text-muted-foreground">
            Marque presença por GPS. Defina o local do escritório uma vez.
          </p>
          <Button size="sm" onClick={onOpenEscritorio}>
            Configurar local
          </Button>
        </>
      ) : (
        <>
          {presenteHoje && (
            <div className="flex items-center gap-2 text-sm text-credit">
              <span className="size-2 rounded-full bg-credit" />
              Presença de hoje registrada
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={doCheckIn} loading={busy}>
            Registrar presença (hoje)
          </Button>
          {msg && (
            <p className={cn("text-xs font-medium", msg.ok ? "text-credit" : "text-destructive")}>
              {msg.text}
            </p>
          )}
          {msg?.outside && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPresencial(hoje, true);
                setMsg({ text: "Marcado manualmente.", ok: true });
              }}
            >
              Marcar mesmo assim
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
