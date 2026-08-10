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
    <div className="flex items-center gap-2 rounded-lg bg-background py-1.5 pl-3 pr-1.5 text-xs">
      <span className="num font-bold">{date.split("-").reverse().join("/")}</span>
      <span className="text-muted-foreground">{name}</span>
      <span
        onClick={onDelete}
        className="grid size-[18px] cursor-pointer place-items-center rounded text-faint hover:bg-debit-bg hover:text-destructive"
      >
        ×
      </span>
    </div>
  );
}
