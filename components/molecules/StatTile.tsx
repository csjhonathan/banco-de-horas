import { cn } from "@/lib/utils";

/** Bloco de estatística (rótulo / valor / legenda) usado nas grades de stats. */
export function StatTile({
  label,
  value,
  valueClassName,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("num mt-1 text-xl font-bold", valueClassName)}>{value}</div>
      {sub != null && <div className="mt-px text-[11px] text-faint">{sub}</div>}
    </div>
  );
}
