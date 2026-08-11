"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Jornada, State } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { JornadaRow, type JornadaDraft } from "@/components/molecules/JornadaRow";
import { secToHMSParts } from "@/lib/horas";

function parseHM(str: string): number {
  const p = String(str).trim().split(":");
  return (parseInt(p[0], 10) || 0) * 3600 + (parseInt(p[1], 10) || 0) * 60;
}

function toDraft(j: Jornada, first: boolean): JornadaDraft {
  const [hh, mm] = secToHMSParts(j.metaDiaSec);
  return { desde: first ? "" : j.desde, metaHM: `${hh}:${mm}`, dias: [...j.diasSemana] };
}

export function JornadaDialog({
  open,
  onOpenChange,
  db,
  hoje,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  db: State;
  hoje: string;
  onSave: (jornadas: Jornada[]) => void;
}) {
  const [rows, setRows] = useState<JornadaDraft[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const js = db.jornadas?.length
      ? db.jornadas
      : [{ desde: "0000-01-01", metaDiaSec: db.metaDiaSec, diasSemana: db.diasSemana }];
    setRows(js.map((j, i) => toDraft(j, i === 0)));
    setError("");
  }, [open, db.jornadas, db.metaDiaSec, db.diasSemana]);

  function updateRow(i: number, next: JornadaDraft) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? next : r)));
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }
  function addRow() {
    setRows((rs) => {
      const last = rs[rs.length - 1];
      return [...rs, { desde: hoje, metaHM: last?.metaHM || "08:00", dias: last?.dias ?? [1, 2, 3, 4, 5] }];
    });
  }

  function save() {
    // valida horas
    for (const r of rows) {
      const sec = parseHM(r.metaHM);
      if (sec <= 0 || sec > 24 * 3600) {
        setError("Jornada diária inválida (entre 00:01 e 24:00).");
        return;
      }
    }
    // valida datas das vigências extras (todas menos a inicial)
    const dated = rows.slice(1);
    for (const r of dated) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.desde)) {
        setError("Toda vigência adicional precisa de uma data de início.");
        return;
      }
    }
    const datas = dated.map((r) => r.desde);
    if (new Set(datas).size !== datas.length) {
      setError("Duas vigências não podem começar no mesmo dia.");
      return;
    }

    const jornadas: Jornada[] = rows.map((r, i) => ({
      desde: i === 0 ? "0000-01-01" : r.desde,
      metaDiaSec: parseHM(r.metaHM),
      diasSemana: [...r.dias],
    }));
    onSave(jornadas);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jornada de trabalho</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3">
          <p className="text-xs text-muted-foreground">
            Cada vigência vale a partir da sua data até a próxima começar. Mudou de
            jornada (promoção, novo contrato)? Adicione uma vigência com a data da
            virada — o histórico anterior continua contando pela jornada antiga.
          </p>

          <div className="flex max-h-[52vh] flex-col gap-2.5 overflow-y-auto pr-1 thin-scroll">
            {rows.map((r, i) => (
              <JornadaRow
                key={i}
                value={r}
                first={i === 0}
                onChange={(next) => updateRow(i, next)}
                onRemove={rows.length > 1 && i > 0 ? () => removeRow(i) : undefined}
              />
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addRow} className="w-fit gap-1.5">
            <Plus className="size-4" />
            Nova vigência
          </Button>

          <div className="min-h-4 text-xs font-semibold text-destructive">{error}</div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
