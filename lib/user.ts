// Helpers de usuário/Clockify compartilhados entre as API routes.
// (webhookSecrets pode ser objeto {upd,new,del} novo ou array legado.)
import type { ClockifyPublic, UserDoc, WebhookSecrets } from "@/types";

const DEFAULT_TZ = process.env.DEFAULT_TZ || "America/Sao_Paulo";

export function credsFrom(user: UserDoc) {
  const c = user.clockify;
  return {
    apiKey: c?.apiKey ?? "",
    workspaceId: c?.workspaceId,
    userId: c?.userId,
    tz: DEFAULT_TZ,
  };
}

export function secretList(ws?: WebhookSecrets | string[]): string[] {
  if (!ws) return [];
  return Array.isArray(ws)
    ? ws.filter(Boolean)
    : (Object.values(ws).filter(Boolean) as string[]);
}

export function slotsOf(ws?: WebhookSecrets | string[]) {
  if (!ws || Array.isArray(ws)) return { upd: false, new: false, del: false };
  return { upd: !!ws.upd, new: !!ws.new, del: !!ws.del };
}

export function clockifyPublic(user: UserDoc | null): ClockifyPublic {
  const c = user?.clockify;
  if (!c || !c.apiKey) return { configured: false };
  return {
    configured: true,
    workspaceId: c.workspaceId,
    name: c.name,
    email: c.email,
    apiKeySaved: !!c.apiKey,
    webhookSlots: slotsOf(c.webhookSecrets),
    webhookSecretsCount: secretList(c.webhookSecrets).length,
    webhookConfigured: secretList(c.webhookSecrets).length > 0,
  };
}

/** URL pública do webhook: WEBHOOK_URL tem prioridade; senão deriva do request. */
export function webhookUrlFor(req: Request): string {
  const envUrl = process.env.WEBHOOK_URL || "";
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/clockify/webhook`;
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host") || "localhost:3000";
  return `${proto}://${host}/api/clockify/webhook`;
}

export const ALLOW_REGISTER = process.env.ALLOW_REGISTER !== "false";
