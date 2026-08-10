"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useBancoDeHoras } from "@/hooks/useBancoDeHoras";
import { useBackup } from "@/hooks/useBackup";
import { TopBar } from "./TopBar";
import { HeroSaldo } from "./HeroSaldo";
import { MonthCard } from "./MonthCard";
import { FeriadosPanel } from "./FeriadosPanel";
import { JornadaDialog } from "./dialogs/JornadaDialog";
import { ImportDialog } from "./dialogs/ImportDialog";
import { ClockifyDialog } from "./dialogs/ClockifyDialog";

/** Container do app: fia os hooks de estado aos organismos e diálogos. */
export function Dashboard() {
  const banco = useBancoDeHoras();
  const backup = useBackup({
    dbRef: banco.dbRef,
    replaceFromServer: banco.replaceFromServer,
    setViewYM: banco.setViewYM,
    hoje: banco.HOJE,
  });

  const [jornadaOpen, setJornadaOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clockifyOpen, setClockifyOpen] = useState(false);

  // bloqueia o auto-refresh enquanto algum diálogo estiver aberto
  useEffect(() => {
    banco.setDialogsOpen(jornadaOpen || importOpen || clockifyOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaOpen, importOpen, clockifyOpen]);

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
    return (
      <div className="mx-auto mt-[10vh] max-w-md px-4 text-center text-sm text-faint">
        Carregando…
      </div>
    );
  }

  const { db, me, viewYM } = banco;

  return (
    <>
      <div className="mx-auto flex max-w-[840px] flex-col gap-4 px-4 pb-20 pt-6">
        <TopBar
          me={me}
          db={db}
          saveStatus={banco.saveStatus}
          onOpenJornada={() => setJornadaOpen(true)}
          onOpenClockify={() => setClockifyOpen(true)}
          onExport={backup.exportBackup}
          onImport={backup.importBackup}
          onReset={backup.reset}
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
          onSyncToday={banco.syncToday}
          onOpenImport={() => setImportOpen(true)}
          onBusyChange={banco.setBusy}
        />
        <FeriadosPanel db={db} setFeriado={banco.setFeriado} deleteFeriado={banco.deleteFeriado} />
        <p className="text-center text-[11px] text-faint">
          Salvo no servidor (MongoDB) · sincronizável com o Clockify · v3.0
        </p>
      </div>

      <JornadaDialog open={jornadaOpen} onOpenChange={setJornadaOpen} db={db} onSave={banco.setJornada} />
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
