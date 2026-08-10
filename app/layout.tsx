import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banco de Horas",
  description: "Controle de banco de horas integrado ao Clockify (somente leitura).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      {/* suppressHydrationWarning: extensões (ColorZilla etc.) injetam
          atributos no <body> antes do React hidratar — é falso positivo. */}
      <body className="min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
