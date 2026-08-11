"use client";

import { useEffect, useState } from "react";
import type { MesFechado, State } from "@/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/molecules/Field";
import { Input } from "@/components/ui/input";
import { StatTile } from "@/components/molecules/StatTile";
import { fechadoMeta, saldoColor, signed, toHMS } from "@/lib/horas";

/** Mês consolidado (saldo fechado) com recalibração de dias/total. */
export function ClosedMonthView({
  db,
  fechado,
  recalibrar,
}: {
  db: State;
  fechado: MesFechado;
  recalibrar: (ym: string, dias: number, trab: number) => void;
}) {
  const meta = fechadoMeta(db, fechado);
  const saldo = fechado.trab - meta;
  const [dias, setDias] = useState(String(fechado.dias));
  const [trab, setTrab] = useState(toHMS(fechado.trab));

  useEffect(() => {
    setDias(String(fechado.dias));
    setTrab(toHMS(fechado.trab));
  }, [fechado.dias, fechado.trab]);

  function save() {
    const nDias = +dias;
    const parts = trab.split(":").map((n) => +n || 0);
    const nTrab = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    if (nDias <= 0 || nTrab <= 0) {
      alert("Valores inválidos.");
      return;
    }
    recalibrar(fechado.ym, nDias, nTrab);
  }

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <StatTile label="Dias úteis" value={fechado.dias} />
        <StatTile label="Meta do mês" value={toHMS(meta)} />
        <StatTile label="Trabalhado" value={toHMS(fechado.trab)} />
        <StatTile label="Saldo fechado" value={signed(saldo, false)} valueClassName={saldoColor(saldo)} />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <Field label="Dias úteis">
          <Input type="number" value={dias} onChange={(e) => setDias(e.target.value)} className="w-[120px]" />
        </Field>
        <Field label="Total trabalhado (h:m:s)">
          <Input
            type="text"
            value={trab}
            onChange={(e) => setTrab(e.target.value)}
            className="num w-[120px]"
          />
        </Field>
        <Button variant="ghost" onClick={save}>
          Recalibrar mês
        </Button>
      </div>
      <div className="mt-3.5 border-t border-border pt-3.5 text-xs text-muted-foreground">
        Mês consolidado — o saldo veio fechado (sem lançamento dia a dia). Se bater o
        Clockify e der diferença, recalibra aqui.
      </div>
    </div>
  );
}
