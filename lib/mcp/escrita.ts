// Ferramentas de ESCRITA do MCP — mexem só no estado do app (NUNCA no
// Clockify) e nunca gravam direto: calculam a prévia (antes → depois e o efeito
// no saldo, com a regra do app) e devolvem um token; quem grava é
// `confirmar_acao`, depois do "sim" da pessoa. Pensadas pra lançar horas
// vindas de outra fonte (ex.: o MCP da empresa) sem a IA fazer conta: o
// servidor soma apontamentos do mesmo dia e calcula início/fim.
import { isDiaTrabalho, noBanco, rangeDias, saldoGeral } from "@/lib/horas";
import type { State } from "@/types";
import { carregarContexto, hm, saldo } from "./contexto";
import { proporAcao, type Patch } from "./acoes";
import { ToolInputError, argDia, diaSemana, diaValido, tipoDoDia, type McpTool, type Quem } from "./shared";

const MAX_DIA = 24 * 3600;
const MAX_ITENS = 400;

/**
 * Duração → segundos. Aceita "HH:MM", "HH:MM:SS", "8h", "8h30", "8h30m",
 * "45min", ou número (horas decimais, ex.: 7.5).
 */
export function parseDuracao(v: unknown, campo: string): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.round(v * 3600);
  if (typeof v === "string") {
    const s = v.trim().toLowerCase().replace(",", ".");
    let m = /^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
    if (m && +m[2] < 60 && +(m[3] ?? 0) < 60) return +m[1] * 3600 + +m[2] * 60 + +(m[3] ?? 0);
    m = /^(\d{1,3})\s*h\s*(?:(\d{1,2})\s*(?:m|min)?)?$/.exec(s);
    if (m && +(m[2] ?? 0) < 60) return +m[1] * 3600 + +(m[2] ?? 0) * 60;
    m = /^(\d{1,4})\s*min$/.exec(s);
    if (m) return +m[1] * 60;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 3600);
  }
  throw new ToolInputError(`"${campo}" inválido: use "HH:MM", "8h30" ou horas decimais (ex.: 7.5).`);
}

/** "HH:MM" → segundos desde 00:00. */
function parseHorario(v: unknown, campo: string): number {
  const m = typeof v === "string" ? /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v.trim()) : null;
  if (!m || +m[1] > 23 || +m[2] > 59 || +(m[3] ?? 0) > 59) {
    throw new ToolInputError(`"${campo}" deve ser um horário HH:MM.`);
  }
  return +m[1] * 3600 + +m[2] * 60 + +(m[3] ?? 0);
}

function argDias(args: Record<string, unknown>, key: string): string[] {
  const v = args[key];
  if (!Array.isArray(v) || v.length === 0) throw new ToolInputError(`Informe "${key}" (lista de datas AAAA-MM-DD).`);
  if (v.length > MAX_ITENS) throw new ToolInputError(`No máximo ${MAX_ITENS} datas por vez.`);
  const bad = v.find((d) => typeof d !== "string" || !diaValido(d));
  if (bad !== undefined) throw new ToolInputError(`Data inválida em "${key}": ${JSON.stringify(bad)}.`);
  return [...new Set(v as string[])].sort();
}

/** Efeito no saldo geral de aplicar `patch` (calculado com a regra do app). */
function efeito(state: State, hoje: string, patch: Patch): string {
  const depois = structuredClone(state) as unknown as Record<string, Record<string, unknown>>;
  for (const [k, v] of Object.entries(patch.set ?? {})) {
    const [campo, dia] = k.split(".");
    (depois[campo] ??= {})[dia] = v;
  }
  for (const k of patch.unset ?? []) {
    const [campo, dia] = k.split(".");
    if (depois[campo]) delete depois[campo][dia];
  }
  return saldo(saldoGeral(depois as unknown as State, hoje) - saldoGeral(state, hoje));
}

async function contexto(quem: Quem) {
  // Prévia sobre o estado SALVO (é nele que a escrita cai), sem a camada ao vivo.
  const ctx = await carregarContexto(quem.username, { aoVivo: false });
  const avisos: string[] = [];
  if (ctx.clockifyOn) {
    avisos.push(
      "Clockify conectado: dias que tiverem horas no Clockify podem ser sobrescritos pelo sync automático (hoje), pelo webhook ou por uma importação de período.",
    );
  }
  return { ...ctx, avisos };
}

function avisoForaDoBanco(state: State, dias: string[], avisos: string[]) {
  const fora = dias.filter((d) => !noBanco(state, d));
  if (fora.length) {
    avisos.push(`${fora.length} dia(s) antes do início do banco (${state.inicioBanco}): ficam só no histórico, não entram no saldo.`);
  }
}

/* ------------------------------------------------------------------ */

const lancarHoras: McpTool = {
  name: "lancar_horas",
  title: "Lançar horas trabalhadas",
  kind: "write",
  description:
    "Prepara o lançamento de horas trabalhadas em um ou vários dias (ex.: apontamentos vindos do sistema da empresa). Cada item tem a data e OU a duração (horas: \"08:30\", \"8h30\", 7.5) OU o início e o fim (\"09:00\"/\"12:30\"). Mande cada apontamento como veio: itens do mesmo dia são SOMADOS pelo servidor — não some você. modo=substituir (padrão) troca o total do dia; modo=somar acrescenta ao que já está lançado. Devolve a prévia (antes → depois e o efeito no saldo) e um token: NADA é gravado até confirmar_acao.",
  inputSchema: {
    type: "object",
    properties: {
      lancamentos: {
        type: "array",
        maxItems: MAX_ITENS,
        items: {
          type: "object",
          properties: {
            data: { type: "string", description: "AAAA-MM-DD" },
            horas: { type: ["string", "number"], description: "Duração: \"HH:MM\", \"8h30\" ou horas decimais." },
            inicio: { type: "string", description: "Horário de início HH:MM (use com fim, no lugar de horas)." },
            fim: { type: "string", description: "Horário de fim HH:MM (mesmo dia)." },
          },
          required: ["data"],
        },
      },
      modo: { type: "string", enum: ["substituir", "somar"], description: "Padrão: substituir." },
    },
    required: ["lancamentos"],
  },
  async run(args, quem) {
    const itens = args.lancamentos;
    if (!Array.isArray(itens) || itens.length === 0) throw new ToolInputError('Informe "lancamentos".');
    if (itens.length > MAX_ITENS) throw new ToolInputError(`No máximo ${MAX_ITENS} itens por vez.`);
    const modo = args.modo === undefined || args.modo === "" ? "substituir" : args.modo;
    if (modo !== "substituir" && modo !== "somar") throw new ToolInputError('"modo" deve ser substituir ou somar.');

    const porDia = new Map<string, { sec: number; itens: number }>();
    itens.forEach((raw, i) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const data = argDia(it, "data");
      let sec: number;
      if (it.horas !== undefined && it.horas !== null && it.horas !== "") {
        if (it.inicio || it.fim) throw new ToolInputError(`Item ${i + 1}: use horas OU inicio/fim, não os dois.`);
        sec = parseDuracao(it.horas, `lancamentos[${i}].horas`);
      } else if (it.inicio && it.fim) {
        const ini = parseHorario(it.inicio, `lancamentos[${i}].inicio`);
        const fim = parseHorario(it.fim, `lancamentos[${i}].fim`);
        if (fim <= ini) throw new ToolInputError(`Item ${i + 1}: o fim deve ser depois do início (mesmo dia).`);
        sec = fim - ini;
      } else {
        throw new ToolInputError(`Item ${i + 1} (${data}): informe horas ou inicio+fim.`);
      }
      const cur = porDia.get(data) ?? { sec: 0, itens: 0 };
      porDia.set(data, { sec: cur.sec + sec, itens: cur.itens + 1 });
    });

    const ctx = await contexto(quem);
    const s = ctx.state;
    const set: Record<string, number> = {};
    const dias = [...porDia.keys()].sort();
    const previa = dias.map((d) => {
      const antes = s.registros[d];
      const { sec, itens: n } = porDia.get(d)!;
      const depois = modo === "somar" ? (antes || 0) + sec : sec;
      if (depois > MAX_DIA) throw new ToolInputError(`${d}: o total do dia passaria de 24h (${hm(depois)}).`);
      set[`registros.${d}`] = depois;
      return {
        data: d,
        dia_semana: diaSemana(d),
        tipo: tipoDoDia(s, d),
        ...(n > 1 ? { apontamentos_somados: n } : {}),
        antes: antes === undefined ? "sem lançamento" : hm(antes),
        depois: hm(depois),
      };
    });
    const iguais = previa.filter((p) => p.antes === p.depois).length;
    avisoForaDoBanco(s, dias, ctx.avisos);
    const patch: Patch = { set };
    const resumo = `Lançar horas em ${dias.length} dia(s) (${modo})`;
    return {
      acao: resumo,
      previa,
      ...(iguais ? { sem_mudanca: `${iguais} dia(s) já estão com esse valor` } : {}),
      efeito_no_saldo_geral: efeito(s, ctx.hoje, patch),
      ...(ctx.avisos.length ? { avisos: ctx.avisos } : {}),
      ...(await proporAcao(quem, "lancar_horas", resumo, patch)),
    };
  },
};

const apagarLancamentos: McpTool = {
  name: "apagar_lancamentos",
  title: "Apagar lançamentos de horas",
  kind: "write",
  description:
    "Prepara a remoção do lançamento de horas de um ou mais dias (o dia útil que já passou sem lançamento volta a contar como débito). Devolve a prévia e um token: NADA é apagado até confirmar_acao.",
  inputSchema: {
    type: "object",
    properties: { datas: { type: "array", items: { type: "string" }, description: "Datas AAAA-MM-DD." } },
    required: ["datas"],
  },
  async run(args, quem) {
    const datas = argDias(args, "datas");
    const ctx = await contexto(quem);
    const s = ctx.state;
    const existentes = datas.filter((d) => d in s.registros);
    if (!existentes.length) return { acao: "nada a apagar", observacao: "Nenhuma dessas datas tem lançamento." };
    const patch: Patch = { unset: existentes.map((d) => `registros.${d}`) };
    const resumo = `Apagar o lançamento de ${existentes.length} dia(s)`;
    return {
      acao: resumo,
      previa: existentes.map((d) => ({ data: d, dia_semana: diaSemana(d), tipo: tipoDoDia(s, d), apagar: hm(s.registros[d]) })),
      ...(existentes.length < datas.length
        ? { sem_lancamento: datas.filter((d) => !(d in s.registros)) }
        : {}),
      efeito_no_saldo_geral: efeito(s, ctx.hoje, patch),
      ...(ctx.avisos.length ? { avisos: ctx.avisos } : {}),
      ...(await proporAcao(quem, "apagar_lancamentos", resumo, patch)),
    };
  },
};

const registrarAtestado: McpTool = {
  name: "registrar_atestado",
  title: "Registrar atestado",
  kind: "write",
  description:
    "Prepara o registro de horas de atestado num dia (abatem a meta daquele dia; nunca viram crédito sozinhas). horas=0 remove o atestado do dia. Devolve a prévia e um token: NADA é gravado até confirmar_acao.",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "string", description: "AAAA-MM-DD" },
      horas: { type: ["string", "number"], description: "\"HH:MM\", \"4h\" ou horas decimais; 0 remove." },
    },
    required: ["data", "horas"],
  },
  async run(args, quem) {
    const d = argDia(args, "data");
    const sec = parseDuracao(args.horas, "horas");
    if (sec > MAX_DIA) throw new ToolInputError("Atestado acima de 24h.");
    const ctx = await contexto(quem);
    const s = ctx.state;
    const antes = s.atestados?.[d] ?? 0;
    if (sec === 0 && !antes) return { acao: "nada a fazer", observacao: "Esse dia não tem atestado." };
    const patch: Patch = sec ? { set: { [`atestados.${d}`]: sec } } : { unset: [`atestados.${d}`] };
    const resumo = sec ? `Atestado de ${hm(sec)} em ${d}` : `Remover o atestado de ${d}`;
    return {
      acao: resumo,
      previa: { data: d, dia_semana: diaSemana(d), tipo: tipoDoDia(s, d), antes: antes ? hm(antes) : "sem atestado", depois: sec ? hm(sec) : "sem atestado" },
      efeito_no_saldo_geral: efeito(s, ctx.hoje, patch),
      ...(await proporAcao(quem, "registrar_atestado", resumo, patch)),
    };
  },
};

const marcarFerias: McpTool = {
  name: "marcar_ferias",
  title: "Marcar ou desmarcar férias",
  kind: "write",
  description:
    "Prepara a marcação (ou, com remover=true, a remoção) de férias num período: dia de férias não conta meta nem gera débito. Devolve a prévia (quantos dias úteis o período cobre e o efeito no saldo) e um token: NADA é gravado até confirmar_acao.",
  inputSchema: {
    type: "object",
    properties: {
      de: { type: "string", description: "Primeiro dia AAAA-MM-DD" },
      ate: { type: "string", description: "Último dia AAAA-MM-DD" },
      remover: { type: "boolean", description: "true = desmarca as férias do período." },
    },
    required: ["de", "ate"],
  },
  async run(args, quem) {
    const de = argDia(args, "de");
    const ate = argDia(args, "ate");
    if (de > ate) throw new ToolInputError('"de" deve ser antes de "ate".');
    const dias = rangeDias(de, ate);
    if (dias.length > 366) throw new ToolInputError("Período de no máximo 366 dias.");
    const remover = args.remover === true;
    const ctx = await contexto(quem);
    const s = ctx.state;
    const alvo = dias.filter((d) => (remover ? !!s.ferias?.[d] : !s.ferias?.[d]));
    if (!alvo.length) return { acao: "nada a fazer", observacao: remover ? "Não há férias no período." : "O período já está todo de férias." };
    const patch: Patch = remover ? { unset: alvo.map((d) => `ferias.${d}`) } : { set: Object.fromEntries(alvo.map((d) => [`ferias.${d}`, true])) };
    const resumo = `${remover ? "Desmarcar" : "Marcar"} férias de ${de} a ${ate}`;
    return {
      acao: resumo,
      dias_no_periodo: dias.length,
      dias_uteis_afetados: alvo.filter((d) => isDiaTrabalho(s, d)).length,
      efeito_no_saldo_geral: efeito(s, ctx.hoje, patch),
      ...(await proporAcao(quem, "marcar_ferias", resumo, patch)),
    };
  },
};

const marcarPresencial: McpTool = {
  name: "marcar_presencial",
  title: "Marcar dias presenciais",
  kind: "write",
  description:
    "Prepara a marcação (ou, com remover=true, a remoção) de dias em que a pessoa foi ao escritório. Não afeta o saldo. Devolve a prévia e um token: NADA é gravado até confirmar_acao.",
  inputSchema: {
    type: "object",
    properties: {
      datas: { type: "array", items: { type: "string" }, description: "Datas AAAA-MM-DD." },
      remover: { type: "boolean", description: "true = desmarca." },
    },
    required: ["datas"],
  },
  async run(args, quem) {
    const datas = argDias(args, "datas");
    const remover = args.remover === true;
    const ctx = await contexto(quem);
    const s = ctx.state;
    const alvo = datas.filter((d) => (remover ? !!s.presencial?.[d] : !s.presencial?.[d]));
    if (!alvo.length) return { acao: "nada a fazer", observacao: "Nada muda nessas datas." };
    const patch: Patch = remover
      ? { unset: alvo.map((d) => `presencial.${d}`) }
      : { set: Object.fromEntries(alvo.map((d) => [`presencial.${d}`, true])) };
    const resumo = `${remover ? "Desmarcar" : "Marcar"} ${alvo.length} dia(s) presencial(is)`;
    return { acao: resumo, dias: alvo, ...(await proporAcao(quem, "marcar_presencial", resumo, patch)) };
  },
};

export const ESCRITA: McpTool[] = [lancarHoras, apagarLancamentos, registrarAtestado, marcarFerias, marcarPresencial];
