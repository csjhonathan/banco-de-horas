"use client";

import { Field } from "./Field";
import { Input } from "@/components/ui/input";

/** Par de campos De / Até. */
export function DateRangeFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="mt-3 flex gap-3">
      <Field label="De" className="flex-1">
        <Input type="date" value={start} onChange={(e) => onStart(e.target.value)} />
      </Field>
      <Field label="Até" className="flex-1">
        <Input type="date" value={end} onChange={(e) => onEnd(e.target.value)} />
      </Field>
    </div>
  );
}
