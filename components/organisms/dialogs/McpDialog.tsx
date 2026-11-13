"use client";

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebhookUrlBox } from "@/components/molecules/WebhookUrlBox";
import { McpGrantRow } from "@/components/molecules/McpGrantRow";
import { McpCallRow } from "@/components/molecules/McpCallRow";
import { useMcpAccess } from "@/hooks/useMcpAccess";

const SECTION = "mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground";

/**
 * Integração com IA via MCP: o endereço pra colar no cliente (Claude, ChatGPT,
 * Gemini…), o passo a passo de cada um, os apps que você autorizou (revogar) e
 * as últimas consultas feitas por eles.
 */
export function McpDialog({
  open,
  onOpenChange,
  on401,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  on401: () => void;
}) {
  const { data, error, loading, revoking, revoke } = useMcpAccess(open, on401);
  const url = data?.mcpUrl ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>IA (MCP)</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-5">
          <p className="text-xs text-muted-foreground">
            Conecte o Claude, o ChatGPT ou outra IA ao seu banco de horas e pergunte coisas como “qual meu saldo?”,
            “que horas posso sair hoje?” ou “lança aqui as horas que estão no sistema da empresa”. A IA também pode
            lançar horas, atestados, férias e dias presenciais, mas <b>sempre mostra uma prévia e só grava depois do
            seu “sim”</b>. O Clockify nunca é alterado. O login é o seu, por OAuth.
          </p>

          <div>
            <Label>Endereço do servidor MCP</Label>
            <WebhookUrlBox url={url} />
          </div>

          <div>
            <div className={SECTION}>Como conectar</div>
            <Tabs defaultValue="claude-code">
              <TabsList className="w-full">
                <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="gemini">Gemini CLI</TabsTrigger>
              </TabsList>
              <TabsContent value="claude-code" className="mt-2.5 text-xs text-muted-foreground">
                <p>No terminal:</p>
                <pre className="num mt-1.5 overflow-x-auto rounded-md bg-background p-2.5 text-[11px] text-foreground">
                  claude mcp add --transport http banco-de-horas {url || "<endereço>"}
                </pre>
                <p className="mt-1.5">
                  Depois, no Claude Code, rode <code>/mcp</code> e escolha <b>Authenticate</b>: o navegador abre esta
                  tela pra você autorizar.
                </p>
              </TabsContent>
              <TabsContent value="claude" className="mt-2.5 text-xs text-muted-foreground">
                <ol className="flex list-decimal flex-col gap-1 pl-4">
                  <li>
                    No Claude (web ou desktop): <b>Configurações → Conectores → Adicionar conector personalizado</b>.
                  </li>
                  <li>Dê um nome (ex.: Banco de Horas) e cole o endereço acima.</li>
                  <li>
                    Clique em <b>Conectar</b>, entre com sua conta daqui e autorize.
                  </li>
                </ol>
              </TabsContent>
              <TabsContent value="chatgpt" className="mt-2.5 text-xs text-muted-foreground">
                <ol className="flex list-decimal flex-col gap-1 pl-4">
                  <li>
                    No ChatGPT: <b>Configurações → Apps e conectores</b>; em <i>Configurações avançadas</i>, ative o{" "}
                    <b>modo de desenvolvedor</b>.
                  </li>
                  <li>
                    <b>Criar</b> conector: cole o endereço acima e escolha autenticação <b>OAuth</b>.
                  </li>
                  <li>Entre com sua conta daqui e autorize.</li>
                </ol>
              </TabsContent>
              <TabsContent value="gemini" className="mt-2.5 text-xs text-muted-foreground">
                <p>
                  Em <code>~/.gemini/settings.json</code>:
                </p>
                <pre className="num mt-1.5 overflow-x-auto rounded-md bg-background p-2.5 text-[11px] text-foreground">
                  {`{ "mcpServers": { "banco-de-horas": { "httpUrl": "${url || "<endereço>"}" } } }`}
                </pre>
                <p className="mt-1.5">
                  No Gemini CLI, <code>/mcp auth banco-de-horas</code> abre esta tela pra autorizar.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <div className={SECTION}>Apps autorizados</div>
            {loading && !data ? (
              <div className="h-12 animate-pulse rounded-md bg-muted" />
            ) : data?.grants.length ? (
              <div className="flex flex-col gap-2">
                {data.grants.map((g) => (
                  <McpGrantRow key={g.id} grant={g} revoking={revoking === g.id} onRevoke={() => revoke(g.id)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-faint">Nenhum app autorizado ainda.</p>
            )}
          </div>

          {!!data?.calls.length && (
            <div>
              <div className={SECTION}>Últimas consultas</div>
              <div className="divide-y divide-border">
                {data.calls.map((c) => (
                  <McpCallRow key={c.id} call={c} />
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
