// Estado inicial + migração (portado de server/seed.js, sem alterar as regras).
import type { State } from "@/types";

export const FERIADOS_VER = 2;

/**
 * Feriados / folgas oficiais da Conecta 2026 — só os dias em que a empresa
 * NÃO funciona.
 */
export const FERIADOS_OFICIAIS: Record<string, string> = {
  "2026-01-01": "Confraternizacao Universal",
  "2026-02-16": "Carnaval (facultativo · pode trocar c/ feriado do sindicato)",
  "2026-02-17": "Carnaval",
  "2026-04-03": "Paixao de Cristo",
  "2026-04-20": "Emenda — folga trocada com Sao Jorge (23/04)",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalhador",
  "2026-06-04": "Corpus Christi",
  "2026-06-05": "Emenda — folga trocada com Sao Joao (24/06)",
  "2026-09-07": "Independencia do Brasil",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamacao da Republica",
  "2026-11-20": "Consciencia Negra",
  "2026-12-24": "Vespera de Natal (facultativo · ideal compensar dez/jan)",
  "2026-12-25": "Natal",
  "2026-12-31": "Vespera de Ano Novo (facultativo · ideal compensar dez/jan)",
};

// jornada padrão: 8h por dia útil (em segundos)
const META_DIA_PADRAO = 28800;

/**
 * Estado inicial. Começa VAZIO de lançamentos/meses fechados —
 * apenas os feriados oficiais já vêm carregados.
 */
export function seed(): State {
  return {
    feriadosVersion: FERIADOS_VER,
    metaDiaSec: META_DIA_PADRAO,
    fechados: [],
    registros: {},
    feriados: { ...FERIADOS_OFICIAIS },
  };
}

/**
 * Injeta os feriados oficiais que faltarem, sem mexer no resto.
 * Retorna true se algo mudou (para o chamador decidir persistir).
 */
export function migrate(db: State): boolean {
  let changed = false;
  if (!db.feriados) {
    db.feriados = {};
    changed = true;
  }
  if (!Array.isArray(db.fechados)) {
    db.fechados = [];
    changed = true;
  }
  if (!db.registros || typeof db.registros !== "object") {
    db.registros = {};
    changed = true;
  }
  if (typeof db.metaDiaSec !== "number" || db.metaDiaSec <= 0) {
    db.metaDiaSec = META_DIA_PADRAO;
    changed = true;
  }
  if ((db.feriadosVersion || 0) < FERIADOS_VER) {
    for (const [d, n] of Object.entries(FERIADOS_OFICIAIS)) {
      if (!(d in db.feriados)) {
        db.feriados[d] = n;
        changed = true;
      }
    }
    db.feriadosVersion = FERIADOS_VER;
    changed = true;
  }
  return changed;
}

/** Valida o formato do estado (usado no PUT /api/state). */
export function validState(s: unknown): s is State {
  const v = s as State;
  return (
    !!v &&
    typeof v === "object" &&
    typeof v.registros === "object" &&
    Array.isArray(v.fechados) &&
    typeof v.feriados === "object"
  );
}
