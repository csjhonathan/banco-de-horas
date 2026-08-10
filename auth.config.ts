// Config do Auth.js compartilhada e SEM providers — segura para rodar no
// middleware (edge). O provider Credentials (que usa mongodb + crypto, só
// Node) fica em auth.ts. Padrão "split config" recomendado pelo Auth.js.
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // confia no host do request (necessário atrás de proxy/ngrok e em deploys
  // fora da Vercel, que já é detectada automaticamente).
  trustHost: true,
  // providers reais ficam em auth.ts (Node); aqui vazio p/ manter edge-safe.
  providers: [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 dias
  pages: { signIn: "/login" },
  callbacks: {
    // Protege as páginas do app; o /login fica público. As API routes fazem
    // a própria checagem via auth(). O matcher do middleware limita o alcance.
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const onLogin = request.nextUrl.pathname.startsWith("/login");
      if (onLogin) return true;
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.name = token.sub;
      return session;
    },
  },
};
