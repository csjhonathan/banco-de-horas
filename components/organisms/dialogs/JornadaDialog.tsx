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
import { WeekdayPicker } from "@/components/molecules/WeekdayPicker";
import { fmtJornada, secToHMSParts } from "@/lib/horas";
import { cn } from "@/lib/utils";

function parseHM(str: string): number {
  const p = String(str).trim().split(":");
  return (parseInt(p[0], 10) || 0) * 3600 + (parseInt(p[1], 10) || 0) * 60;
}

type Mode = "dia" | "semana";

export function JornadaDialog({
  open,
  onOpenChange,
  db,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  db: State;
  onSave: (sec: number, diasSemana: number[]) => void;
}) {
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [mode, setMode] = useState<Mode>("dia");
  const [value, setValue] = useState("08:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDias(db.diasSemana?.length ? db.diasSemana : [1, 2, 3, 4, 5]);
      setMode("dia");
      const [hh, mm] = secToHMSParts(db.metaDiaSec);
      setValue(`${hh}:${mm}`);
      setError("");
    }
  }, [open, db.metaDiaSec, db.diasSemana]);

  const n = dias.length;
  const entered = parseHM(value);
  const diaSec = mode === "dia" ? entered : n ? Math.round(entered / n) : 0;
  const semanaSec = mode === "dia" ? entered * n : entered;

  function save() {
    if (diaSec <= 0 || diaSec > 24 * 3600) {
      setError("Jornada diária inválida (entre 00:01 e 24:00).");
      return;
    }
    onSave(diaSec, dias);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jornada de trabalho</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4">
          <div className="flex flex-col gap-2">
            <Label>Dias trabalhados</Label>
            <WeekdayPicker value={dias} onChange={setDias} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Informar jornada por</Label>
            <div className="inline-flex w-fit rounded-lg bg-muted p-1">
              {(["dia", "semana"] as Mode[]).map((mo) => (
                <button
                  key={mo}
                  type="button"
                  onClick={() => setMode(mo)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    mode === mo
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mo === "dia" ? "Por dia" : "Por semana"}
                </button>
              ))}
            </div>
            <Input
              inputMode="numeric"
              placeholder={mode === "dia" ? "08:00" : "40:00"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-32"
            />
          </div>

          <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            {diaSec > 0 ? (
              <>
                = <b className="text-foreground">{fmtJornada(diaSec)}</b>/dia ·{" "}
                <b className="text-foreground">{fmtJornada(semanaSec)}</b>/semana
                <span className="text-faint"> · {n} dia(s)/semana</span>
              </>
            ) : (
              "informe um valor válido"
            )}
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
