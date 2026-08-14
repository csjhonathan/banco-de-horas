"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PresetGrid, type Preset } from "@/components/molecules/PresetGrid";
import { DateRangeFields } from "@/components/molecules/DateRangeFields";
import { cn } from "@/lib/utils";
import { addDays, mondayOf, monthRangeYM, shiftYM } from "@/lib/horas";
import type { SyncResult } from "@/lib/api";

const PRESETS: Preset[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Esta semana" },
  { key: "semana-ant", label: "Semana anterior" },
  { key: "duas-semanas", label: "Últimas duas semanas" },
  { key: "mes", label: "Este mês" },
  { key: "mes-visto", label: "Mês em exibição" },
  { key: "mes-ant", label: "Último mês" },
  { key: "ano", label: "Este ano" },
  { key: "ano-ant", label: "Ano passado" },
];

export function ImportDialog({
  open,
  onOpenChange,
  viewYM,
  hoje,
  onSync,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  viewYM: string;
  hoje: string;
  onSync: (start: string, end: string) => Promise<SyncResult>;
}) {
  const ranges = useMemo<Record<string, () => [string, string]>>(
    () => ({
      hoje: () => [hoje, hoje],
      ontem: () => [addDays(hoje, -1), addDays(hoje, -1)],
      semana: () => [mondayOf(hoje), addDays(mondayOf(hoje), 6)],
      "semana-ant": () => [addDays(mondayOf(hoje), -7), addDays(mondayOf(hoje), -1)],
      "duas-semanas": () => [addDays(mondayOf(hoje), -7), addDays(mondayOf(hoje), 6)],
      mes: () => monthRangeYM(hoje.slice(0, 7)),
      "mes-visto": () => monthRangeYM(viewYM),
      "mes-ant": () => monthRangeYM(shiftYM(hoje.slice(0, 7), -1)),
      ano: () => [hoje.slice(0, 4) + "-01-01", hoje.slice(0, 4) + "-12-31"],
      "ano-ant": () => {
        const y = +hoje.slice(0, 4) - 1;
        return [y + "-01-01", y + "-12-31"];
      },
    }),
    [hoje, viewYM],
  );

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const [s, e] = ranges["mes-visto"]();
      setStart(s);
      setEnd(e);
      setActive("mes-visto");
      setMsg(null);
    }
  }, [open, ranges]);

  function applyPreset(k: string) {
    const [s, e] = ranges[k]();
    setStart(s);
    setEnd(e);
    setActive(k);
  }

  async function go() {
    if (!start || !end) return setMsg({ text: "Escolha o período.", ok: false });
    if (start > end) return setMsg({ text: "A data inicial está depois da final.", ok: false });
    setBusy(true);
    setMsg(null);
    try {
      const res = await onSync(start, end);
      setMsg({
        text: `${res.days} dia(s) importado(s) · ${res.count} entrada(s) de ${res.range.start} a ${res.range.end}.`,
        ok: true,
      });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "erro ao importar", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar do Clockify</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <PresetGrid presets={PRESETS} active={active} onSelect={applyPreset} />
          <DateRangeFields
            start={start}
            end={end}
            onStart={(v) => {
              setStart(v);
              setActive(null);
            }}
            onEnd={(v) => {
              setEnd(v);
              setActive(null);
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Importar <strong>substitui o banco inteiro</strong> por este período:
            fica só o que o Clockify tem em {start || "…"} → {end || "…"}, e tudo
            fora disso é apagado. Como é 100% Clockify, dá pra reimportar quando
            quiser.
          </p>
          {msg && (
            <div
              className={cn(
                "mt-2 text-xs font-semibold",
                msg.ok ? "text-credit" : "text-destructive",
              )}
            >
              {msg.text}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={go} loading={busy}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
