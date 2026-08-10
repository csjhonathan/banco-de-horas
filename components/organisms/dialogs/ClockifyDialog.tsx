"use client";

import { useEffect, useState } from "react";
import type { MeResponse } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebhookUrlBox } from "@/components/molecules/WebhookUrlBox";
import { SecretRow } from "@/components/molecules/SecretRow";
import { cn } from "@/lib/utils";
import { API, ApiError, type CfConfigResult } from "@/lib/api";

export function ClockifyDialog({
  open,
  onOpenChange,
  me,
  onApply,
  onOpenImport,
  on401,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  me: MeResponse;
  onApply: (cfg: CfConfigResult) => void;
  onOpenImport: () => void;
  on401: () => void;
}) {
  const cfg = me.clockify;
  const [apiKey, setApiKey] = useState("");
  const [ws, setWs] = useState("");
  const [secUpd, setSecUpd] = useState("");
  const [secNew, setSecNew] = useState("");
  const [secDel, setSecDel] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey("");
      setWs(cfg.workspaceId || "");
      setSecUpd("");
      setSecNew("");
      setSecDel("");
      setMsg(null);
    }
  }, [open, cfg.workspaceId]);

  const slots = cfg.webhookSlots || { upd: false, new: false, del: false };

  async function save() {
    const body: Record<string, unknown> = {};
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    if (ws.trim()) body.workspaceId = ws.trim();
    const sec: Record<string, string> = {};
    if (secUpd.trim()) sec.upd = secUpd.trim();
    if (secNew.trim()) sec.new = secNew.trim();
    if (secDel.trim()) sec.del = secDel.trim();
    if (Object.keys(sec).length) body.webhookSecrets = sec;

    if (!apiKey.trim() && !cfg.configured)
      return setMsg({ text: "Cole a chave de API.", ok: false });
    if (!Object.keys(body).length)
      return setMsg({
        text: "Nada para salvar — cole a chave ou as signing secrets.",
        ok: false,
      });

    setBusy(true);
    try {
      const res = await API.cfSave(body);
      onApply(res);
      setMsg({
        text:
          "Salvo! " +
          (res.name || res.email || "") +
          " · workspace " +
          res.workspaceId +
          (res.webhookConfigured ? " · webhook ✓" : ""),
        ok: true,
      });
      setSecUpd("");
      setSecNew("");
      setSecDel("");
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "erro ao salvar", ok: false });
      if (e instanceof ApiError && e.status === 401) on401();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remover a integração com o Clockify?")) return;
    try {
      await API.cfRemove();
      onApply({ configured: false });
      setMsg({ text: "Integração removida.", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "erro ao remover", ok: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Integração Clockify</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div
            className={cn(
              "rounded-md px-3 py-2.5 text-xs",
              cfg.configured
                ? "bg-credit/10 font-medium text-credit"
                : "bg-muted text-muted-foreground",
            )}
          >
            {cfg.configured
              ? `Conectado como ${cfg.name || cfg.email || "?"} · workspace ${cfg.workspaceId || ""}`
              : "Não configurado. Cole a sua chave de API do Clockify."}
          </div>

          <Label htmlFor="cfKey" className="mt-2.5">
            Chave de API
          </Label>
          <Input
            id="cfKey"
            type="password"
            placeholder="cole a API key (Settings → API no Clockify)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <small
            className={cn(
              "mt-0.5 block text-[10px] font-semibold",
              cfg.configured || cfg.apiKeySaved ? "text-credit" : "text-faint",
            )}
          >
            {cfg.configured || cfg.apiKeySaved ? "✓ chave salva" : "nenhuma chave salva"}
          </small>

          <Label htmlFor="cfWs" className="mt-2.5">
            Workspace ID (opcional)
          </Label>
          <Input
            id="cfWs"
            placeholder="deixe vazio p/ usar o workspace ativo"
            value={ws}
            onChange={(e) => setWs(e.target.value)}
          />

          <div className="mt-4 border-t border-border pt-3.5">
            <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Webhook — atualização em tempo real (opcional)
            </div>
            <Label className="mt-2.5">URL do endpoint (registre no Clockify)</Label>
            <WebhookUrlBox url={me.webhookUrl} />

            <details className="mt-2.5 text-xs text-muted-foreground">
              <summary className="cursor-pointer list-none font-medium text-foreground underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                Como configurar no Clockify
              </summary>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4">
                <li>
                  No Clockify: <b>Settings → Webhooks → Create webhook</b>.
                </li>
                <li>
                  Cole a <b>URL</b> acima no campo <i>URL do endpoint</i>.
                </li>
                <li>
                  Em <b>Evento</b>, pesquise por <code>tempo</code> e escolha{" "}
                  <b>Entrada de tempo · atualizada (mim)</b>. Crie também para{" "}
                  <b>criada (mim)</b> e <b>excluída (mim)</b> — mesma URL.
                </li>
                <li>
                  Cada webhook gera uma <b>signing secret</b> — copie e cole abaixo.
                </li>
                <li>
                  Volte aqui e clique em <b>Salvar</b>.
                </li>
              </ol>
            </details>

            <Label className="mt-3 block">
              Signing secrets (cole a de cada webhook que você criou)
            </Label>
            <div className="mt-1 flex flex-col gap-2.5">
              <SecretRow label="Atualizada" value={secUpd} onChange={setSecUpd} configured={slots.upd} />
              <SecretRow label="Criada" value={secNew} onChange={setSecNew} configured={slots.new} />
              <SecretRow label="Excluída" value={secDel} onChange={setSecDel} configured={slots.del} />
            </div>
          </div>

          {msg && (
            <div
              className={cn(
                "mt-3 text-xs font-semibold",
                msg.ok ? "text-credit" : "text-destructive",
              )}
            >
              {msg.text}
            </div>
          )}
        </DialogBody>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={remove}>
            Remover
          </Button>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                if (!cfg.configured) return setMsg({ text: "Configure a chave primeiro.", ok: false });
                onOpenImport();
              }}
            >
              Importar do Clockify
            </Button>
            <Button onClick={save} loading={busy}>
              Salvar e testar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
