import { cn } from "@/lib/utils";

/** Campo rotulado (label em cima do controle). */
export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
