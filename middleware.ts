// Protege as páginas do app (edge). Usa a config SEM providers (edge-safe);
// o provider Credentials fica em auth.ts (Node). Só roda na home — as API
// routes fazem a própria checagem e /login é público.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/"],
};
