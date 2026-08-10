"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/molecules/Field";
import { TimeInput } from "@/components/molecules/TimeInput";
import { hmsToSec, secToHMSParts } from "@/lib/horas";

export interface LogFormHandle {
  edit: (day: string) => void;
}

/**
 * Formulário de lançamento do dia (data + h:m:s) + atalhos do Clockify.
 * Guarda o próprio estado; o parent dispara `edit(day)` via ref para prefilar.
 */
export const LogForm = forwardRef<
  LogFormHandle,
  {
    viewYM: string;
    hoje: string;
    registros: Record<string, number>;
    cfConfigured: boolean;
    onSubmit: (day: string, sec: number) => void;
    onShiftMonth: (ym: string) => void;
    onSyncToday: () => Promise<void>;
    onOpenImport: () => void;
    onBusyChange: (busy: boolean) => void;
  }
>(function LogForm(
  {
    viewYM,
    hoje,
    registros,
    cfConfigured,
    onSubmit,
    onShiftMonth,
    onSyncToday,
    onOpenImport,
    onBusyChange,
  },
  ref,
) {
  const [dateVal, setDateVal] = useState(hoje.startsWith(viewYM) ? hoje : viewYM + "-01");
  const [h, setH] = useState("");
  const [min, setMin] = useState("");
  const [s, setS] = useState("");
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const firstInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setDateVal(hoje.startsWith(viewYM) ? hoje : viewYM + "-01");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYM]);

  useEffect(() => {
    onBusyChange(editing || !!h || !!min || !!s);
  }, [editing, h, min, s, onBusyChange]);

  useImperativeHandle(ref, () => ({
    edit(day: string) {
      setDateVal(day);
      if (registros[day] != null) {
        const [hh, mm, ss] = secToHMSParts(registros[day]);
        setH(hh);
        setMin(mm);
        setS(ss);
      } else {
        setH("");
        setMin("");
        setS("");
      }
      setEditing(true);
      setTimeout(() => {
        firstInput.current?.focus();
        if (formRef.current)
          window.scrollTo({ top: formRef.current.offsetTop - 80, behavior: "smooth" });
      }, 0);
    },
  }));

  function reset() {
    setH("");
    setMin("");
    setS("");
    setEditing(false);
  }

  function save() {
    if (!dateVal) {
      alert("Escolhe o dia.");
      return;
    }
    if (dateVal.slice(0, 7) !== viewYM) onShiftMonth(dateVal.slice(0, 7));
    const sec = hmsToSec(h, min, s);
    if (sec < 0) {
      alert("Valor inválido.");
      return;
    }
    onSubmit(dateVal, sec);
    reset();
  }

  async function doSyncToday() {
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
    <div ref={formRef} className="flex flex-wrap items-end gap-3.5 border-t border-border px-5 py-4">
      <Field label="Dia">
        <Input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} className="w-auto" />
      </Field>
      <Field label="Trabalhado (h : m : s)">
        <TimeInput h={h} min={min} s={s} onChange={(nh, nm, ns) => { setH(nh); setMin(nm); setS(ns); }} firstRef={firstInput} />
      </Field>
      <Button onClick={save}>{editing ? "Salvar edição" : "Lançar dia"}</Button>
      {editing && (
        <Button variant="ghost" onClick={reset}>
          Cancelar
        </Button>
      )}
      {cfConfigured && (
        <>
          <Button variant="accent" onClick={doSyncToday} disabled={syncing}>
            {syncing ? "sincronizando…" : "Sincronizar hoje"}
          </Button>
          <Button variant="accent" onClick={onOpenImport}>
            Importar do Clockify
          </Button>
        </>
      )}
    </div>
  );
});
