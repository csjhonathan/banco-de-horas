"use client";

import { useRef } from "react";
import { parseTimeString } from "@/lib/horas";

/**
 * Trio de inputs h : m : s com auto-avanço e colagem inteligente
 * ("8:30", "83000"...). Controlado: recebe h/min/s e emite onChange(h,min,s).
 */
export function TimeInput({
  h,
  min,
  s,
  onChange,
  firstRef,
}: {
  h: string;
  min: string;
  s: string;
  onChange: (h: string, min: string, s: string) => void;
  firstRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const localFirst = useRef<HTMLInputElement>(null);
  const th = firstRef ?? localFirst;
  const tm = useRef<HTMLInputElement>(null);
  const ts = useRef<HTMLInputElement>(null);

  const values: [string, string, string] = [h, min, s];
  const refs = [th, tm, ts];

  function handleInput(idx: number, value: string) {
    if (value.includes(":") || value.length > 2) {
      const parsed = parseTimeString(value);
      if (parsed) {
        onChange(parsed[0], parsed[1], parsed[2]);
        return;
      }
    }
    const next: [string, string, string] = [...values];
    next[idx] = value;
    onChange(next[0], next[1], next[2]);
    if (value.length >= 2 && idx < 2) refs[idx + 1].current?.focus();
  }

  function handlePaste(ev: React.ClipboardEvent) {
    const t = ev.clipboardData.getData("text");
    if (t && (t.includes(":") || t.replace(/\D/g, "").length > 2)) {
      const parsed = parseTimeString(t);
      if (parsed) {
        ev.preventDefault();
        onChange(parsed[0], parsed[1], parsed[2]);
      }
    }
  }

  const cls =
    "num w-8 border-none bg-transparent text-center text-base font-bold outline-none";

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-card px-2.5 py-1.5 focus-within:border-accent">
      <input
        ref={th}
        className={cls}
        inputMode="numeric"
        maxLength={2}
        placeholder="08"
        value={h}
        onChange={(e) => handleInput(0, e.target.value)}
        onPaste={handlePaste}
      />
      <span className="font-bold text-faint">:</span>
      <input
        ref={tm}
        className={cls}
        inputMode="numeric"
        maxLength={2}
        placeholder="00"
        value={min}
        onChange={(e) => handleInput(1, e.target.value)}
        onPaste={handlePaste}
      />
      <span className="font-bold text-faint">:</span>
      <input
        ref={ts}
        className={cls}
        inputMode="numeric"
        maxLength={2}
        placeholder="00"
        value={s}
        onChange={(e) => handleInput(2, e.target.value)}
        onPaste={handlePaste}
      />
    </div>
  );
}
