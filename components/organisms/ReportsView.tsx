"use client";

import { useMemo, useState } from "react";
import { BarChart3, List, PieChart } from "lucide-react";
import type { BreakdownSlice } from "@/types";
import { useBreakdown } from "@/hooks/useBreakdown";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarBreakdown } from "@/components/molecules/BarBreakdown";
import { ListBreakdown } from "@/components/molecules/ListBreakdown";
import { DonutBreakdown } from "@/components/molecules/DonutBreakdown";
import { addDays, dm, monthRangeYM, toHMS } from "@/lib/horas";
import { cn } from "@/lib/utils";

type Preset = "mes" | "30d" | "ano" | "custom";
type Mode = "lista" | "barras" | "pizza";

const MODES: { id: Mode; label: string; icon: typeof List }[] = [
  { id: "lista", label: "Lista", icon: List },
  { id: "barras", label: "Barras", icon: BarChart3 },
  { id: "pizza", label: "Pizza", icon: PieChart },
];

/**
 * Tela de relatórios do Clockify (SOMENTE LEITURA): tempo por projeto, cliente e
 * tarefa no período. Alterna entre lista, barras e pizza (donut). Período segue
 * o mês visto com troca rápida.
 */
export function ReportsView({
  viewYM,
  hoje,
  onUnauthorized,
}: {
  viewYM: string;
  hoje: string;
  onUnauthorized: () => void;
}) {
  const [preset, setPreset] = useState<Preset>("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [mode, setMode] = useState<Mode>("barras");

  const { start, end } = useMemo(() => {
    switch (preset) {
      case "30d":
        return { start: addDays(hoje, -29), end: hoje };
      case "ano":
        return { start: `${hoje.slice(0, 4)}-01-01`, end: hoje };
      case "custom": {
        const [ms, me] = monthRangeYM(viewYM);
        return { start: customStart || ms, end: customEnd || me };
      }
      case "mes":
      default: {
        const [ms, me] = monthRangeYM(viewYM);
        return { start: ms, end: me };
      }
    }
  }, [preset, viewYM, hoje, customStart, customEnd]);

  const { data, loading, error } = useBreakdown(true, start, end, onUnauthorized);

  function renderContent(items: BreakdownSlice[], topN: number) {
    if (!data) return null;
    if (mode === "lista") return <ListBreakdown items={items} total={data.totalSec} topN={topN} />;
    if (mode === "pizza") return <DonutBreakdown items={items} total={data.totalSec} />;
    return <BarBreakdown items={items} total={data.totalSec} topN={topN} />;
  }

  return (
    <Card className="animate-fade flex flex-col gap-4 p-5">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-bold">Relatórios</span>
          <span className="text-xs text-faint">por projeto · cliente · tarefa</span>
        </div>
        {data && !loading && (
          <div className="text-right">
            <span className="num text-lg font-bold text-credit tabular-nums">
              {toHMS(data.totalSec)}
            </span>
            <span className="ml-2 text-xs text-faint">{data.entries} lançamento(s)</span>
          </div>
        )}
      </div>

      {/* controles: período (esq.) + modo (dir.) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
          className="h-9 rounded-md border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="mes">Mês visto</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="ano">Este ano</option>
          <option value="custom">Personalizado…</option>
        </select>

        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 rounded-md border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="text-faint">–</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 rounded-md border bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </>
        )}

        <span className="text-xs text-faint">
          {dm(start)} – {dm(end)}
        </span>

        {/* segmentado de modo */}
        <div className="ml-auto inline-flex rounded-lg bg-muted p-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-all",
                  mode === m.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* conteúdo */}
      {error ? (
        <div className="py-10 text-center text-[13px] text-destructive">{error}</div>
      ) : loading ? (
        <div className="flex flex-col gap-3 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-1 h-3 w-1/3 rounded bg-muted" />
              <div className="h-2 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : !data || data.totalSec === 0 ? (
        <div className="py-10 text-center text-[13px] text-faint">
          Nenhum lançamento no Clockify neste período.
        </div>
      ) : (
        <Tabs defaultValue="projetos" className="mt-1">
          <TabsList className="mb-4">
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>
          <TabsContent value="projetos" className="animate-fade">
            {renderContent(data.byProject, 12)}
          </TabsContent>
          <TabsContent value="clientes" className="animate-fade">
            {renderContent(data.byClient, 12)}
          </TabsContent>
          <TabsContent value="tarefas" className="animate-fade">
            {renderContent(data.byTask, 15)}
          </TabsContent>
        </Tabs>
      )}
    </Card>
  );
}
