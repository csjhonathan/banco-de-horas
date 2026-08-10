"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Caixa com a URL do webhook + botão copiar. */
export function WebhookUrlBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-background py-1.5 pl-3 pr-1.5">
      <code className="num flex-1 break-all text-[11px]">{url || "—"}</code>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? "Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}
