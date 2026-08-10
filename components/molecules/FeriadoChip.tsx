"use client";

/** Chip de feriado/folga com botão de remover. */
export function FeriadoChip({
  date,
  name,
  onDelete,
}: {
  date: string;
  name: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 py-1 pl-2.5 pr-1 text-xs">
      <span className="num font-medium">{date.split("-").reverse().join("/")}</span>
      <span className="text-muted-foreground">{name}</span>
      <span
        onClick={onDelete}
        className="grid size-[18px] cursor-pointer place-items-center rounded text-faint hover:bg-debit/10 hover:text-destructive"
      >
        ×
      </span>
    </div>
  );
}
