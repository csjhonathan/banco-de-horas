import type { McpCall } from "@/types";
import { cn } from "@/lib/utils";

const ROTULOS: Record<string, string> = {
  initialize: "conectou",
  "tools/list": "listou as ferramentas",
  "consent.approve": "autorização aprovada",
  "consent.deny": "autorização recusada",
  "grant.revoke": "acesso revogado",
  "rate.limited": "bloqueado por excesso de chamadas",
};

/** Uma linha da auditoria do MCP (o que a IA consultou, quando, se deu certo). */
export function McpCallRow({ call }: { call: McpCall }) {
  const when = new Date(call.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const what = call.tool ?? ROTULOS[call.method] ?? call.method;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-xs" title={call.error ?? undefined}>
      <div className="flex min-w-0 items-baseline gap-2">
        <span className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", call.ok ? "bg-credit" : "bg-destructive")} />
        <code className={cn("truncate", call.tool ? "text-foreground" : "text-muted-foreground")}>{what}</code>
        {call.clientName && <span className="hidden truncate text-faint sm:inline">{call.clientName}</span>}
      </div>
      <span className="num shrink-0 text-muted-foreground">{when}</span>
    </div>
  );
}
