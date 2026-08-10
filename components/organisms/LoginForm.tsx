"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoMark, Wordmark } from "@/components/molecules/Logo";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] -z-10 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
      />
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark size={46} />
          <div>
            <Wordmark className="text-2xl" />
            <p className="mt-1.5 text-sm text-muted-foreground">
              Seu banco de horas · saldo por usuário
            </p>
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as "login" | "register");
            setError("");
          }}
        >
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            {allowRegister && <TabsTrigger value="register">Criar conta</TabsTrigger>}
          </TabsList>
        </Tabs>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user">Usuário</Label>
            <Input
              id="user"
              autoComplete="username"
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pass">Senha</Label>
            <Input
              id="pass"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}
          <Button type="submit" loading={busy} className="mt-1 w-full">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
