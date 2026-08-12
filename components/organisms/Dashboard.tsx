"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useBancoDeHoras } from "@/hooks/useBancoDeHoras";
import { useRunningTimer } from "@/hooks/useRunningTimer";
import { TopBar } from "./TopBar";
import { HeroSaldo } from "./HeroSaldo";
import { RunningTimer } from "./RunningTimer";
import { MonthCard } from "./MonthCard";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { JornadaDialog } from "./dialogs/JornadaDialog";
import { AtestadoDialog } from "./dialogs/AtestadoDialog";
import { EscritorioDialog } from "./dialogs/EscritorioDialog";
import { ImportDialog } from "./dialogs/ImportDialog";
import { ClockifyDialog } from "./dialogs/ClockifyDialog";

/** Container do app: fia os hooks de estado aos organismos e diálogos. */
export function Dashboard() {
  const banco = useBancoDeHoras();

  const [jornadaOpen, setJornadaOpen] = useState(false);
  const [atestadoOpen, setAtestadoOpen] = useState(false);
  const [atestadoDay, setAtestadoDay] = useState<string | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [clockifyOpen, setClockifyOpen] = useState(false);
  const [escritorioOpen, setEscritorioOpen] = useState(false);
  const [view, setView] = useState<"mes" | "relatorios">("mes");

  const timer = useRunningTimer(
    !!banco.me?.clockify.configured,
    banco.handle401,
    banco.syncToday,
  );

  useEffect(() => {
    banco.setDialogsOpen(
      jornadaOpen || atestadoOpen || importOpen || clockifyOpen || escritorioOpen,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaOpen, atestadoOpen, importOpen, clockifyOpen, escritorioOpen]);

  async function logout() {
    await signOut({ redirect: false });
    banco.handle401();
  }

  if (banco.bootError) {
    return (
      <div className="mx-auto mt-[10vh] max-w-md px-4 text-center text-sm text-destructive">
        Erro ao carregar seus dados: {banco.bootError}
      </div>
    );
  }
  if (!banco.ready || !banco.db || !banco.me) {
    return <DashboardSkeleton />;
  }

  const { db, me, viewYM } = banco;

  // Overlay ao vivo: soma o decorrido do cronômetro no dia de hoje SÓ para os
  // números de saldo (Hero + StatsRail). Não é persistido; o ledger (formulário
  // e tabela) continua usando `db` real pra não inflar edição/linha do dia.
  const liveExtra = timer.running ? timer.elapsedSec : 0;
  const liveDb =
    liveExtra > 0
      ? { ...db, registros: { ...db.registros, [banco.HOJE]: (db.registros[banco.HOJE] || 0) + liveExtra } }
      : db;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <TopBar
          me={me}
          db={db}
          saveStatus={banco.saveStatus}
          onOpenJornada={() => setJornadaOpen(true)}
          onOpenClockify={() => setClockifyOpen(true)}
          onLogout={logout}
        />
        <HeroSaldo db={liveDb} hoje={banco.HOJE} />
        {me.clockify.configured && (
          <RunningTimer
            db={db}
            hoje={banco.HOJE}
            running={timer.running}
            elapsedSec={timer.elapsedSec}
            error={timer.error}
          />
        )}
        <MonthCard
          db={db}
          liveDb={liveDb}
          me={me}
          viewYM={viewYM}
          hoje={banco.HOJE}
          onShiftMonth={banco.setViewYM}
          setRegistro={banco.setRegistro}
          deleteRegistro={banco.deleteRegistro}
          recalibrar={banco.recalibrar}
          setFeriado={banco.setFeriado}
          deleteFeriado={banco.deleteFeriado}
          togglePresencial={banco.togglePresencial}
          setPresencial={banco.setPresencial}
          addFerias={banco.addFerias}
          removeFerias={banco.removeFerias}
          onSyncToday={banco.syncToday}
          onOpenImport={() => setImportOpen(true)}
          onOpenClockify={() => setClockifyOpen(true)}
          onOpenAtestado={(day) => {
            setAtestadoDay(day);
            setAtestadoOpen(true);
          }}
          onCheckIn={banco.checkIn}
          onOpenEscritorio={() => setEscritorioOpen(true)}
          onBusyChange={banco.setBusy}
          view={me.clockify.configured ? view : "mes"}
          onView={me.clockify.configured ? setView : undefined}
          onUnauthorized={banco.handle401}
        />
      </div>

      <JornadaDialog
        open={jornadaOpen}
        onOpenChange={setJornadaOpen}
        db={db}
        hoje={banco.HOJE}
        onSave={banco.setJornadas}
      />
      <AtestadoDialog
        open={atestadoOpen}
        onOpenChange={setAtestadoOpen}
        hoje={banco.HOJE}
        initialDay={atestadoDay}
        db={db}
        atestados={db.atestados}
        onSave={banco.setAtestado}
      />
      <EscritorioDialog
        open={escritorioOpen}
        onOpenChange={setEscritorioOpen}
        escritorio={db.escritorio}
        onSave={banco.setEscritorio}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        viewYM={viewYM}
        hoje={banco.HOJE}
        onSync={banco.syncRange}
      />
      <ClockifyDialog
        open={clockifyOpen}
        onOpenChange={setClockifyOpen}
        me={me}
        onApply={banco.applyClockify}
        onOpenImport={() => {
          setClockifyOpen(false);
          setImportOpen(true);
        }}
        on401={banco.handle401}
      />
    </>
  );
}
