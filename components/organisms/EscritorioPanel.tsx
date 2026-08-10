"use client";

import { useEffect, useState } from "react";
import type { State } from "@/types";
import type { CheckInResult } from "@/hooks/useBancoDeHoras";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// trava em memória: auto check-in roda 1x por carregamento de página
// (não re-dispara ao navegar entre meses; reseta no reload → tenta de novo).
let autoCheckDone = false;

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
  const raioEfetivo = Math.max(150, esc?.raioM ?? 150);
  const [checking, setChecking] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  async function runCheck() {
    setChecking(true);
    setGpsMsg(null);
    const r = await onCheckIn();
    setChecking(false);
    if (!r.ok) return setGpsMsg(r.error);
    if (!r.withinRadius) {
      setGpsMsg(`GPS: você está a ${r.distance}m (raio ${raioEfetivo}m). Confira ou marque manualmente.`);
    }
    // dentro do raio: onCheckIn já marcou → presenteHoje vira true e mostra o verde
  }

  // ao abrir, tenta registrar por GPS automaticamente (1x por carregamento)
  useEffect(() => {
    if (autoCheckDone || !esc || presenteHoje) return;
    autoCheckDone = true;
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ) : presenteHoje ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-credit">
            <span className="size-2 rounded-full bg-credit" />
            Presença de hoje registrada
          </span>
          <button
            onClick={() => setPresencial(hoje, false)}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
          >
            desfazer
          </button>
        </div>
      ) : checking ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> verificando sua localização…
        </div>
      ) : (
        <>
          <Button size="sm" onClick={() => setPresencial(hoje, true)}>
            Marcar presença hoje
          </Button>
          {gpsMsg && <p className="text-xs text-muted-foreground">{gpsMsg}</p>}
          <button
            onClick={runCheck}
            className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            tentar por GPS
          </button>
        </>
      )}
    </Card>
  );
}
