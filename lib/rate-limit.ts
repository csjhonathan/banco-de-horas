// Rate limit em memória (janela fixa). Vive no globalThis pra sobreviver aos
// grafos de módulo do Next e ao hot reload. Na Vercel cada instância conta à
// parte — é um freio contra loop descontrolado de agente, não uma cota exata.
interface Entry {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { _rateLimit?: Map<string, Entry> };
const store: Map<string, Entry> = g._rateLimit ?? (g._rateLimit = new Map());

export function hitRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  if (store.size > 5000) for (const [k, e] of store) if (e.resetAt <= now) store.delete(k);
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, retryAfterMs: entry.resetAt - now };
}
