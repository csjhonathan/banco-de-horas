// Estado inicial + migração (portado de server/seed.js, sem alterar as regras).
import type { Jornada, State } from "@/types";

export const FERIADOS_VER = 2;

// `desde` da vigência mais antiga: sentinela que cobre todo o histórico.
const DESDE_SEMPRE = "0000-01-01";

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
// dias trabalhados padrão: segunda a sexta
const DIAS_SEMANA_PADRAO = [1, 2, 3, 4, 5];

/**
 * Estado inicial. Começa VAZIO de lançamentos/meses fechados —
 * apenas os feriados oficiais já vêm carregados.
 */
export function seed(): State {
  return {
    feriadosVersion: FERIADOS_VER,
    jornadas: [
      {
        desde: DESDE_SEMPRE,
        metaDiaSec: META_DIA_PADRAO,
        diasSemana: [...DIAS_SEMANA_PADRAO],
      },
    ],
    metaDiaSec: META_DIA_PADRAO,
    diasSemana: [...DIAS_SEMANA_PADRAO],
    fechados: [],
    registros: {},
    feriados: { ...FERIADOS_OFICIAIS },
    atestados: {},
    presencial: {},
    escritorio: null,
  };
}

/** Uma vigência é válida se tem `desde` (data) e meta diária positiva. */
function jornadaValida(j: unknown): j is Jornada {
  const v = j as Jornada;
  return (
    !!v &&
    typeof v === "object" &&
    typeof v.desde === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.desde) &&
    typeof v.metaDiaSec === "number" &&
    v.metaDiaSec > 0 &&
    Array.isArray(v.diasSemana) &&
    v.diasSemana.length > 0
  );
}

/**
 * Normaliza uma lista de vigências: descarta inválidas, ordena por `desde` e
 * garante ao menos uma (usando o fallback). A vigência mais antiga é rebaixada
 * para o sentinela "desde sempre" para cobrir todo o histórico.
 */
export function normalizeJornadas(
  list: unknown,
  fallback: Jornada,
): Jornada[] {
  const arr = (Array.isArray(list) ? list : []).filter(jornadaValida);
  arr.sort((a, b) => a.desde.localeCompare(b.desde));
  if (!arr.length) return [{ ...fallback, desde: DESDE_SEMPRE }];
  arr[0] = { ...arr[0], desde: DESDE_SEMPRE };
  return arr;
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
  if (!Array.isArray(db.diasSemana) || db.diasSemana.length === 0) {
    db.diasSemana = [...DIAS_SEMANA_PADRAO];
    changed = true;
  }
  // Vigências de jornada: constrói a partir do espelho legado se ausentes e
  // normaliza (ordena/valida). O espelho `metaDiaSec`/`diasSemana` (validado
  // acima) NÃO é sobrescrito aqui — quem escreve as jornadas o mantém em dia
  // com a vigência de hoje; o cálculo histórico usa `jornadas`, não o espelho.
  {
    const fallback: Jornada = {
      desde: DESDE_SEMPRE,
      metaDiaSec: db.metaDiaSec,
      diasSemana: [...db.diasSemana],
    };
    const before = JSON.stringify(db.jornadas ?? null);
    db.jornadas = normalizeJornadas(db.jornadas, fallback);
    if (JSON.stringify(db.jornadas) !== before) changed = true;
  }
  if (!db.atestados || typeof db.atestados !== "object") {
    db.atestados = {};
    changed = true;
  }
  if (!db.presencial || typeof db.presencial !== "object") {
    db.presencial = {};
    changed = true;
  }
  if (db.escritorio === undefined) {
    db.escritorio = null;
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
