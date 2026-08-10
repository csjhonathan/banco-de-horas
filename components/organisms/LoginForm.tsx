"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm({ allowRegister }: { allowRegister: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Preencha usuário e senha.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "não consegui criar a conta");
      }
      const res = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) throw new Error("usuário ou senha inválidos");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro inesperado");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-[8vh] flex max-w-[400px] flex-col gap-4 px-4">
      <Card className="p-7">
        <h1 className="text-[15px] font-bold uppercase tracking-[0.14em]">Banco de Horas</h1>
        <p className="mb-4 mt-1 text-xs text-faint">
          Entre para ver o seu saldo · dados por usuário
        </p>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as "login" | "register");
            setError("");
          }}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            {allowRegister && <TabsTrigger value="register">Criar conta</TabsTrigger>}
          </TabsList>
        </Tabs>

        <form onSubmit={onSubmit} className="flex flex-col gap-1">
          <Label htmlFor="user" className="mb-1.5 mt-2 block">
            Usuário
          </Label>
          <Input
            id="user"
            autoComplete="username"
            placeholder="seu.usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Label htmlFor="pass" className="mb-1.5 mt-3 block">
            Senha
          </Label>
          <Input
            id="pass"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-3 min-h-4 text-xs font-semibold text-destructive">{error}</div>
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-[11px] text-faint">
        Next.js + MongoDB · integração com o Clockify · v3.0
      </p>
    </div>
  );
}
