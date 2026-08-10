"use client";

import { useEffect, useState } from "react";
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
import { Field } from "@/components/molecules/Field";
import { fmtJornada, secToHMSParts } from "@/lib/horas";

function parseHM(str: string): number {
  const p = String(str).trim().split(":");
  return (parseInt(p[0], 10) || 0) * 3600 + (parseInt(p[1], 10) || 0) * 60;
}

export function AtestadoDialog({
  open,
  onOpenChange,
  hoje,
  initialDay,
  metaDiaSec,
  atestados,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hoje: string;
  initialDay?: string;
  metaDiaSec: number;
  atestados: Record<string, number>;
  onSave: (day: string, sec: number) => void;
}) {
  const [day, setDay] = useState(hoje);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      const d = initialDay || hoje;
      setDay(d);
      fill(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hoje, initialDay]);

  function fill(d: string) {
    const cur = atestados[d];
    if (cur) {
      const [hh, mm] = secToHMSParts(cur);
      setValue(`${hh}:${mm}`);
    } else {
      const [hh, mm] = secToHMSParts(metaDiaSec);
      setValue(`${hh}:${mm}`);
    }
  }

  const sec = parseHM(value);
  const existing = !!atestados[day];

  function save() {
    onSave(day, sec > 0 ? sec : 0);
    onOpenChange(false);
  }
  function remove() {
    onSave(day, 0);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar atestado</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4">
          <p className="text-xs text-muted-foreground">
            As horas do atestado abatem a meta do dia. Ex.: com jornada de{" "}
            {fmtJornada(metaDiaSec)}, um atestado de {fmtJornada(metaDiaSec)} zera o dia; um
            atestado menor deixa o restante a trabalhar.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia">
              <Input
                type="date"
                value={day}
                onChange={(e) => {
                  setDay(e.target.value);
                  fill(e.target.value);
                }}
              />
            </Field>
            <Field label="Horas (HH:MM)">
              <Input
                inputMode="numeric"
                placeholder="08:00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
          </div>
          <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            {sec > 0 ? (
              <>
                Credita <b className="text-foreground">{fmtJornada(sec)}</b> no dia{" "}
                <b className="text-foreground">{day.split("-").reverse().join("/")}</b>.
              </>
            ) : (
              "informe as horas do atestado"
            )}
          </div>
        </DialogBody>
        <DialogFooter className={existing ? "justify-between" : undefined}>
          {existing && (
            <Button variant="destructive" onClick={remove}>
              Remover
            </Button>
          )}
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
