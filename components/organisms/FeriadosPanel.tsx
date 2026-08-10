"use client";

import { useState } from "react";
import type { State } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/molecules/Field";
import { FeriadoChip } from "@/components/molecules/FeriadoChip";

export function FeriadosPanel({
  db,
  setFeriado,
  deleteFeriado,
}: {
  db: State;
  setFeriado: (day: string, name: string) => void;
  deleteFeriado: (day: string) => void;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const items = Object.entries(db.feriados).sort((a, b) => a[0].localeCompare(b[0]));

  function add() {
    if (!date) {
      alert("Escolhe a data da folga.");
      return;
    }
    setFeriado(date, name.trim() || "Folga");
    setDate("");
    setName("");
  }

  return (
    <details className="rounded-lg bg-card shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-bold text-muted-foreground [&::-webkit-details-marker]:hidden">
        Feriados &amp; folgas <span className="text-faint">›</span>
      </summary>
      <div className="px-5 pb-4 pt-1">
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {items.length === 0 ? (
            <div className="text-xs text-faint">Nenhum feriado cadastrado.</div>
          ) : (
            items.map(([d, n]) => (
              <FeriadoChip key={d} date={d} name={n} onDelete={() => deleteFeriado(d)} />
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2.5 border-t border-border pt-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Descrição" className="flex-1">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Emenda de carnaval"
              className="min-w-[180px]"
            />
          </Field>
          <Button variant="ghost" onClick={add}>
            Adicionar folga
          </Button>
        </div>
      </div>
    </details>
  );
}
