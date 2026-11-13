"use client";

import { useCallback, useEffect, useState } from "react";
import type { McpAccess } from "@/types";
import { API, ApiError } from "@/lib/api";

/** Endereço do MCP, apps autorizados e últimas chamadas (carrega ao abrir). */
export function useMcpAccess(open: boolean, on401: () => void) {
  const [data, setData] = useState<McpAccess | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fail = useCallback(
    (e: unknown) => {
      setError(e instanceof Error ? e.message : "erro ao carregar");
      if (e instanceof ApiError && e.status === 401) on401();
    },
    [on401],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await API.mcpAccess());
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const revoke = useCallback(
    async (id: string) => {
      setRevoking(id);
      try {
        await API.mcpRevoke(id);
        await load();
      } catch (e) {
        fail(e);
      } finally {
        setRevoking(null);
      }
    },
    [load, fail],
  );

  return { data, error, loading, revoking, revoke, reload: load };
}
