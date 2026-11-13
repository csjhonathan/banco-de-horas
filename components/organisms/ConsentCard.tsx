"use client";

import { useState } from "react";
import { Check, Eye, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/molecules/Logo";
import { API } from "@/lib/api";

/**
 * Consentimento do OAuth do MCP: qual app pede acesso, pra onde o código volta
 * e o que ele vai poder fazer (só ler). Aprovar/Recusar → o servidor devolve
 * o redirect do app e a tela navega pra lá.
 */
export function ConsentCard(
  props:
    | { error: string; username: string }
    | { query: Record<string, string>; username: string; clientName: string; redirectHost: string; tools: string[] },
) {
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState("");

  async function decide(decision: "approve" | "deny") {
    if ("error" in props) return;
    setBusy(decision);
    setError("");
    try {
      const { redirectTo } = await API.oauthConsent({ ...props.query, decision });
      window.location.href = redirectTo;
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro inesperado");
      setBusy(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] -z-10 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
      />
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark size={46} />
          <Wordmark className="text-2xl" />
        </div>

        {"error" in props ? (
          <p className="text-center text-sm text-destructive">{props.error}</p>
        ) : (
          <>
            <p className="text-center text-sm">
              <b>{props.clientName}</b> quer acessar o seu banco de horas.
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Conta <b>@{props.username}</b> · volta para <code className="num">{props.redirectHost}</code>
            </p>

            <div className="mt-5 rounded-md border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <Eye className="size-3.5" /> Poderá consultar
              </div>
              <ul className="flex flex-col gap-1 text-xs">
                {props.tools.map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-credit" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0" />
              Somente leitura: nada é alterado no app nem no Clockify. Dá pra revogar a qualquer momento em
              “IA (MCP)”.
            </p>

            {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={() => decide("deny")} loading={busy === "deny"} disabled={!!busy}>
                Recusar
              </Button>
              <Button onClick={() => decide("approve")} loading={busy === "approve"} disabled={!!busy}>
                Autorizar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
