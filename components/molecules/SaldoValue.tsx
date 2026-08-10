import { signed, saldoColor } from "@/lib/horas";
import { cn } from "@/lib/utils";

/** Um valor de saldo formatado (+HH:MM[:SS]) já com a cor certa. */
export function SaldoValue({
  sec,
  withSec = false,
  className,
}: {
  sec: number;
  withSec?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("num", saldoColor(sec), className)}>{signed(sec, withSec)}</span>
  );
}
