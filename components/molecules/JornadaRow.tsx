"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker } from "@/components/molecules/WeekdayPicker";
import { fmtJornada } from "@/lib/horas";

/** Uma linha do editor de jornada (uma vigência). */
export type JornadaDraft = {
  desde: string; // "" na primeira vigência (vale "desde o início")
  metaHM: string; // "HH:MM"
  dias: number[];
};

function parseHM(str: string): number {
  const p = String(str).trim().split(":");
  return (parseInt(p[0], 10) || 0) * 3600 + (parseInt(p[1], 10) || 0) * 60;
}

export function JornadaRow({
  value,
  first,
  onChange,
  onRemove,
}: {
  value: JornadaDraft;
  first: boolean; // a vigência mais antiga não tem data (vale desde sempre)
  onChange: (next: JornadaDraft) => void;
  onRemove?: () => void;
}) {
  const diaSec = parseHM(value.metaHM);
  const semanaSec = diaSec * value.dias.length;

  return (
    <div className="relative flex flex-col gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        {first ? (
          <span className="text-xs font-medium text-muted-foreground">
            Vigência inicial · vale desde o começo do histórico
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">A partir de</Label>
            <Input
              type="date"
              value={value.desde}
              onChange={(e) => onChange({ ...value, desde: e.target.value })}
              className="h-8 w-[150px]"
            />
          </div>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remover vigência"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Dias trabalhados</Label>
          <WeekdayPicker
            value={value.dias}
            onChange={(dias) => onChange({ ...value, dias })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Horas/dia</Label>
          <Input
            inputMode="numeric"
            placeholder="08:00"
            value={value.metaHM}
            onChange={(e) => onChange({ ...value, metaHM: e.target.value })}
            className="h-9 w-24"
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {diaSec > 0 ? (
          <>
            = <b className="text-foreground">{fmtJornada(diaSec)}</b>/dia ·{" "}
            <b className="text-foreground">{fmtJornada(semanaSec)}</b>/semana
            <span className="text-faint"> · {value.dias.length} dia(s)/semana</span>
          </>
        ) : (
          "informe as horas/dia"
        )}
      </div>
    </div>
  );
}
