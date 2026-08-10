import type { SaveStatus } from "@/hooks/usePersistence";
import { cn } from "@/lib/utils";

const LABEL: Record<SaveStatus, string> = {
  "": "",
  saving: "salvando…",
  ok: "salvo",
  error: "erro",
};

/** Indicador do estado do save otimista (salvando…/salvo/erro). */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      className={cn(
        "min-w-2 text-xs font-semibold tracking-wide",
        status === "saving" && "text-today",
        status === "error" && "text-destructive",
        status === "ok" && "text-credit",
      )}
    >
      {LABEL[status]}
    </span>
  );
}
