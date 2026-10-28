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
  registros,
  onSync,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  viewYM: string;
  hoje: string;
  registros: Record<string, number>;
  onSync: (start: string, end: string, apagarFora: boolean) => Promise<SyncResult>;
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
  const [apagarFora, setApagarFora] = useState(false);
  // 1º clique com "apagar fora" só arma a confirmação; o 2º executa.
  const [confirmando, setConfirmando] = useState(false);

  const foraCount = useMemo(
    () =>
      start && end
        ? Object.keys(registros).filter((d) => d < start || d > end).length
        : 0,
    [registros, start, end],
  );

  useEffect(() => setConfirmando(false), [start, end, apagarFora]);

  useEffect(() => {
    if (open) {
      const [s, e] = ranges["mes-visto"]();
      setStart(s);
      setEnd(e);
      setActive("mes-visto");
      setMsg(null);
      setApagarFora(false);
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
    const apagar = apagarFora && foraCount > 0;
    if (apagar && !confirmando) return setConfirmando(true);
    setBusy(true);
    setMsg(null);
    try {
      const res = await onSync(start, end, apagar);
      const removidos = res.removidosFora
        ? ` · ${res.removidosFora} lançamento(s) fora do período apagado(s)`
        : "";
      setMsg({
        text: `${res.days} dia(s) importado(s) · ${res.count} entrada(s) de ${res.range.start} a ${res.range.end}${removidos}.`,
        ok: true,
      });
      setApagarFora(false);
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
            Importar <strong>substitui só este período</strong>: de {start || "…"} a{" "}
            {end || "…"} fica exatamente o que o Clockify tem (dias sem entrada lá
            são apagados aqui).{" "}
            {apagarFora
              ? "Lançamentos fora da janela também serão apagados."
              : "Lançamentos fora da janela não são tocados."}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={apagarFora}
              onChange={(e) => setApagarFora(e.target.checked)}
              className="mt-0.5 size-3.5 accent-destructive"
            />
            <span>
              <span className="font-medium text-foreground">
                Apagar lançamentos fora deste período
              </span>
              <span className="block text-muted-foreground">
                Só os lançamentos — jornada, férias, atestados, feriados, presença e
                meses fechados ficam como estão.
              </span>
            </span>
          </label>
          {confirmando && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Isso vai apagar <strong>{foraCount} lançamento(s)</strong> fora de{" "}
              {start} a {end}. Clique em “Confirmar” para continuar.
            </div>
          )}
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
          <Button
            onClick={go}
            loading={busy}
            variant={confirmando ? "destructive" : "default"}
          >
            {confirmando ? `Confirmar e apagar ${foraCount}` : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
