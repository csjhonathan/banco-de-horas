// Config completa do Auth.js (Node): Credentials + scrypt reusando o
// esquema de senha do app original. Roda nas API routes (runtime Node).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getUser } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(creds) {
        const u = String(creds?.username || "").trim().toLowerCase();
        const p = String(creds?.password || "");
        if (!u || !p) return null;
        const user = await getUser(u);
        if (!user || !verifyPassword(p, user.salt, user.hash)) return null;
        return { id: user._id, name: user._id };
      },
    }),
  ],
});
