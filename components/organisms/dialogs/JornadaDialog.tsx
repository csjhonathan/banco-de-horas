"use client";

import { useEffect, useState } from "react";
import type { State } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtJornada, secToHMSParts } from "@/lib/horas";

function parseHM(str: string): number {
  const p = String(str).trim().split(":");
  return (parseInt(p[0], 10) || 0) * 3600 + (parseInt(p[1], 10) || 0) * 60;
}

export function JornadaDialog({
  open,
  onOpenChange,
  db,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  db: State;
  onSave: (sec: number) => void;
}) {
  const [value, setValue] = useState("08:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const [hh, mm] = secToHMSParts(db.metaDiaSec);
      setValue(`${hh}:${mm}`);
      setError("");
    }
  }, [open, db.metaDiaSec]);

  const sec = parseHM(value);

  function save() {
    if (sec <= 0 || sec > 24 * 3600) {
      setError("Valor inválido (entre 00:01 e 24:00).");
      return;
    }
    onSave(sec);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jornada de trabalho</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="jornada" className="mt-2.5">
            Horas por dia útil (HH:MM)
          </Label>
          <Input
            id="jornada"
            inputMode="numeric"
            placeholder="08:00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="rounded-md bg-background px-3 py-2.5 text-xs text-muted-foreground">
            {sec > 0
              ? `= ${fmtJornada(sec)}/dia · ${fmtJornada(sec * 5)}/semana`
              : "informe um valor válido"}
          </div>
          <div className="min-h-4 text-xs font-semibold text-destructive">{error}</div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
