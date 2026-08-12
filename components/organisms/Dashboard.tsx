"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useBancoDeHoras } from "@/hooks/useBancoDeHoras";
import { TopBar } from "./TopBar";
import { HeroSaldo } from "./HeroSaldo";
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
        <HeroSaldo db={db} hoje={banco.HOJE} />
        <MonthCard
          db={db}
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
