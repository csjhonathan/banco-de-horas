"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Alterna claro/escuro (classe .dark no <html> + localStorage). */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Alternar tema"
      title="Alternar tema"
      className="text-muted-foreground"
    >
      {/* evita mismatch de hidratação: só decide o ícone no cliente */}
      {dark === null ? <Sun /> : dark ? <Moon /> : <Sun />}
    </Button>
  );
}
