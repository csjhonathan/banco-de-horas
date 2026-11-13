"use client";

import type { McpGrant } from "@/types";
import { Button } from "@/components/ui/button";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Um app autorizado a usar o MCP + botão de revogar. */
export function McpGrantRow({
  grant,
  revoking,
  onRevoke,
}: {
  grant: McpGrant;
  revoking: boolean;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{grant.clientName}</div>
        <div className="text-[11px] text-muted-foreground">
          autorizado {fmt(grant.createdAt)}
          {grant.lastUsedAt ? ` · último uso ${fmt(grant.lastUsedAt)}` : " · nunca usado"}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        loading={revoking}
        onClick={() => {
          if (confirm(`Revogar o acesso de "${grant.clientName}"?`)) onRevoke();
        }}
      >
        Revogar
      </Button>
    </div>
  );
}
