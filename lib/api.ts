// Camada de API do front (mesma origem do Next). Em 401, sinaliza para o
// chamador redirecionar ao /login.
import type { ClockifyPublic, MeResponse, State } from "@/types";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function jfetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let body: any = null;
  try {
    body = await r.json();
  } catch {
    /* corpo vazio */
  }
  if (r.status === 401) throw new ApiError(body?.error || "nao autenticado", 401);
  if (!r.ok) throw new ApiError(body?.error || `${r.status} ${url}`, r.status);
  return body as T;
}

export interface SyncResult {
  state: State;
  days: number;
  count: number;
  range: { start: string; end: string };
}

export interface CfConfigResult extends ClockifyPublic {
  webhookUrl?: string;
}

export const API = {
  me: () => jfetch<MeResponse>("/api/me"),
  getState: () => jfetch<State>("/api/state"),
  putState: (s: State) =>
    jfetch<State>("/api/state", { method: "PUT", body: JSON.stringify(s) }),
  reset: () => jfetch<State>("/api/reset", { method: "POST" }),
  cfGet: () => jfetch<CfConfigResult>("/api/clockify/config"),
  cfSave: (b: unknown) =>
    jfetch<CfConfigResult>("/api/clockify/config", {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  cfRemove: () =>
    jfetch<{ configured: boolean }>("/api/clockify/config", { method: "DELETE" }),
  cfSync: (b?: { start?: string; end?: string }) =>
    jfetch<SyncResult>("/api/clockify/sync", {
      method: "POST",
      body: JSON.stringify(b || {}),
    }),
};
