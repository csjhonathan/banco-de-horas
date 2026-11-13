import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { checkAuthorize, isOAuthError, readAuthorizeParams } from "@/lib/oauth/service";
import { TOOLS } from "@/lib/mcp/tools";
import { ConsentCard } from "@/components/organisms/ConsentCard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Tela de consentimento do OAuth do MCP: a pessoa entra com a PRÓPRIA conta e
 * aprova (ou recusa) o app que pediu acesso. O pedido é conferido de novo no
 * servidor — a tela só repassa a query do /api/oauth/authorize.
 */
export default async function AutorizarPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") query[k] = v;

  const session = await auth();
  if (!session?.user?.name) {
    const back = `/autorizar?${new URLSearchParams(query).toString()}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  const params = readAuthorizeParams(query);
  try {
    const client = await checkAuthorize(params);
    return (
      <ConsentCard
        query={query}
        username={session.user.name}
        clientName={client.name}
        redirectHost={new URL(params.redirectUri).host}
        tools={TOOLS.map((t) => t.title)}
      />
    );
  } catch (error) {
    const message = isOAuthError(error) ? error.description : "Pedido de autorização inválido.";
    return <ConsentCard error={message} username={session.user.name} />;
  }
}
