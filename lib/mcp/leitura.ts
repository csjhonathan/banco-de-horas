// Ferramentas de LEITURA do MCP. As contas (saldo, meta, quanto falta) são
// feitas aqui no servidor com a mesma lógica do app (`lib/horas.ts`); o modelo
// só repassa. Nada aqui grava.
import * as clockify from "@/lib/clockify";
import { credsFrom } from "@/lib/user";
import {
  SEMANAS,
  agruparPeriodos,
  atestadoDe,
  carryIn,
  diasContabilizados,
  diasDoMes,
  fechadoMeta,
  fmtJornada,
  isUtil,
  jornadaDe,
  mesConhecidoList,
  metaDia,
  metaEfetiva,
  noBanco,
  saldoGeral,
  saldoMes,
} from "@/lib/horas";
import { TZ, carregarContexto, hm, saldo, type Contexto } from "./contexto";
import { ToolInputError, argDia, argMes, diaSemana, nomeMes, tipoDoDia, type McpTool } from "./shared";

/** Uma linha do extrato: o que conta no saldo naquele dia, já calculado. */
function linhaDoDia(ctx: Contexto, d: string) {
  const s = ctx.live;
  const trabalhado = s.registros[d] || 0;
  const contabilizado = diasContabilizados(s, d.slice(0, 7), ctx.hoje).includes(d) && noBanco(s, d);
  const meta = metaEfetiva(s, d);
  const atestado = atestadoDe(s, d);
  return {
    data: d,
    dia_semana: diaSemana(d),
    tipo: tipoDoDia(s, d),
    meta: hm(meta),
    ...(atestado ? { atestado: hm(atestado), meta_sem_atestado: hm(metaDia(s, d)) } : {}),
    trabalhado: trabalhado ? hm(trabalhado) : d < ctx.hoje && meta > 0 ? "não lançado" : "—",
    saldo_do_dia: contabilizado ? saldo(trabalhado - meta) : null,
    ...(d === ctx.hoje && ctx.running ? { inclui_cronometro_rodando: true } : {}),
    ...(s.presencial?.[d] ? { presencial: true } : {}),
    ...(!noBanco(s, d) ? { fora_do_banco: "antes do início do banco: só histórico, não entra no saldo" } : {}),
  };
}

function cronometroInfo(ctx: Contexto) {
  const r = ctx.running;
  if (!r) return null;
  return {
    rodando: true,
    descricao: r.description || "(sem descrição)",
    projeto: r.projectName,
    tarefa: r.taskName,
    inicio: new Date(r.start).toLocaleString("pt-BR", { timeZone: TZ }),
    decorrido: hm(r.elapsedSec),
  };
}

/** Horário (no fuso do app) daqui a `sec` segundos. */
function horarioDaqui(sec: number): string {
  return new Date(Date.now() + sec * 1000).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function base(ctx: Contexto) {
  return { fonte: ctx.fonte, ...(ctx.aviso ? { aviso: ctx.aviso } : {}) };
}

/* ------------------------------------------------------------------ */

const resumo: McpTool = {
  name: "resumo_do_banco",
  title: "Resumo do banco de horas",
  kind: "read",
  description:
    "Visão geral AGORA: saldo geral do banco, saldo do mês, meta e trabalhado do mês, o dia de hoje (trabalhado, meta, quanto falta e a previsão de saída se o cronômetro estiver rodando) e quanto trabalhar por dia pra zerar o banco até o fim do mês. Use primeiro para perguntas como \"qual meu saldo?\", \"quanto falta hoje?\", \"que horas posso sair?\".",
  inputSchema: { type: "object", properties: {} },
  async run(_args, { username }) {
    const ctx = await carregarContexto(username);
    const s = ctx.live;
    const ym = ctx.hoje.slice(0, 7);
    const dias = diasDoMes(ym);

    const trabalhadoMes = dias.reduce((a, d) => a + (s.registros[d] || 0), 0);
    const metaMes = dias.reduce((a, d) => a + metaEfetiva(s, d), 0);
    const geral = saldoGeral(s, ctx.hoje);

    const trabHoje = s.registros[ctx.hoje] || 0;
    const metaHoje = metaEfetiva(s, ctx.hoje);
    const faltaHoje = Math.max(0, metaHoje - trabHoje);

    // Pra zerar o banco no fim do mês: meta ainda não descontada (dias úteis de
    // hoje em diante sem lançamento) menos o saldo atual, dividido pelos dias
    // úteis que restam (hoje incluso).
    const restantes = dias.filter((d) => d >= ctx.hoje && isUtil(s, d) && noBanco(s, d));
    const metaPendente = restantes
      .filter((d) => !(d in s.registros))
      .reduce((a, d) => a + metaEfetiva(s, d), 0);
    const precisa = Math.max(0, metaPendente - geral);

    const j = jornadaDe(s, ctx.hoje);
    return {
      hoje: `${ctx.hoje} (${diaSemana(ctx.hoje)})`,
      saldo_geral: saldo(geral),
      saldo_do_mes: saldo(saldoMes(s, ym, ctx.hoje)),
      saldo_ate_o_mes_anterior: saldo(carryIn(s, ym, ctx.hoje)),
      mes: {
        nome: nomeMes(ym),
        meta_do_mes_inteiro: hm(metaMes),
        trabalhado: hm(trabalhadoMes),
        falta_para_a_meta_do_mes: hm(Math.max(0, metaMes - trabalhadoMes)),
        dias_uteis_restantes: restantes.length,
      },
      dia_de_hoje: {
        tipo: tipoDoDia(s, ctx.hoje),
        meta: hm(metaHoje),
        trabalhado: hm(trabHoje),
        falta_para_a_meta: hm(faltaHoje),
        ...(ctx.running && faltaHoje > 0 ? { previsao_de_saida: horarioDaqui(faltaHoje) } : {}),
        ...(trabHoje > metaHoje ? { excedente: hm(trabHoje - metaHoje) } : {}),
      },
      para_zerar_o_banco_ate_o_fim_do_mes:
        restantes.length > 0
          ? { horas_por_dia_util: hm(Math.ceil(precisa / restantes.length)), dias_uteis: restantes.length }
          : "não há mais dias úteis no mês",
      cronometro: cronometroInfo(ctx) ?? (ctx.clockifyOn ? { rodando: false } : "Clockify não conectado"),
      jornada_atual: `${fmtJornada(j.metaDiaSec)} por dia, ${j.diasSemana.map((d) => SEMANAS[d]).join("/")}`,
      ...(s.inicioBanco ? { inicio_do_banco: s.inicioBanco } : {}),
      inclui_cronometro_rodando: !!ctx.running,
      ...base(ctx),
    };
  },
};

const saldoPorMes: McpTool = {
  name: "saldo_por_mes",
  title: "Saldo mês a mês",
  kind: "read",
  description:
    "Linha do tempo do banco: para cada mês, meta, trabalhado, saldo do mês e o saldo ACUMULADO até ele (meses fechados usam a meta congelada no fechamento). Filtre com de/ate (AAAA-MM). Use para \"como foi meu saldo em março?\", \"em que mês fiquei negativo?\".",
  inputSchema: {
    type: "object",
    properties: {
      de: { type: "string", description: "Primeiro mês (AAAA-MM). Opcional." },
      ate: { type: "string", description: "Último mês (AAAA-MM). Opcional." },
    },
  },
  async run(args, { username }) {
    const de = argMes(args, "de");
    const ate = argMes(args, "ate");
    const ctx = await carregarContexto(username);
    const s = ctx.live;
    let acumulado = 0;
    const meses = mesConhecidoList(s).map((ym) => {
      const f = s.fechados.find((x) => x.ym === ym);
      const sm = saldoMes(s, ym, ctx.hoje);
      acumulado += sm;
      let meta: number;
      let trab: number;
      if (f) {
        meta = fechadoMeta(s, f);
        trab = f.trab;
      } else {
        const ds = diasContabilizados(s, ym, ctx.hoje).filter((d) => noBanco(s, d));
        meta = ds.reduce((a, d) => a + metaEfetiva(s, d), 0);
        trab = ds.reduce((a, d) => a + (s.registros[d] || 0), 0);
      }
      return {
        mes: ym,
        nome: nomeMes(ym),
        ...(f ? { fechado: true } : {}),
        ...(ym === ctx.hoje.slice(0, 7) ? { em_andamento: true } : {}),
        meta_ate_agora: hm(meta),
        trabalhado: hm(trab),
        saldo_do_mes: saldo(sm),
        saldo_acumulado: saldo(acumulado),
      };
    });
    const filtrados = meses.filter((m) => (!de || m.mes >= de) && (!ate || m.mes <= ate));
    return {
      saldo_geral: saldo(acumulado),
      meses: filtrados,
      ...(filtrados.length === 0 ? { observacao: "Nenhum mês com lançamento no período." } : {}),
      ...(s.inicioBanco ? { inicio_do_banco: s.inicioBanco } : {}),
      ...base(ctx),
    };
  },
};

const extrato: McpTool = {
  name: "extrato_do_mes",
  title: "Extrato do mês (dia a dia)",
  kind: "read",
  description:
    "Dia a dia de um mês: tipo do dia (útil, feriado, férias, folga), meta, atestado, trabalhado e o saldo de cada dia que conta. Dia útil que já passou sem lançamento conta como débito (−meta). Padrão: mês atual.",
  inputSchema: {
    type: "object",
    properties: { mes: { type: "string", description: "Mês (AAAA-MM). Padrão: o atual." } },
  },
  async run(args, { username }) {
    const ctx = await carregarContexto(username);
    const ym = argMes(args, "mes", ctx.hoje.slice(0, 7))!;
    const s = ctx.live;
    const f = s.fechados.find((x) => x.ym === ym);
    if (f) {
      return {
        mes: nomeMes(ym),
        fechado: true,
        observacao: "Mês fechado: só há o consolidado, sem o dia a dia.",
        dias_uteis: f.dias,
        meta: hm(fechadoMeta(s, f)),
        trabalhado: hm(f.trab),
        saldo_do_mes: saldo(saldoMes(s, ym, ctx.hoje)),
        saldo_acumulado_ate_o_fim_do_mes: saldo(carryIn(s, ym, ctx.hoje) + saldoMes(s, ym, ctx.hoje)),
      };
    }
    return {
      mes: nomeMes(ym),
      saldo_do_mes: saldo(saldoMes(s, ym, ctx.hoje)),
      saldo_anterior: saldo(carryIn(s, ym, ctx.hoje)),
      saldo_acumulado: saldo(carryIn(s, ym, ctx.hoje) + saldoMes(s, ym, ctx.hoje)),
      dias: diasDoMes(ym).map((d) => linhaDoDia(ctx, d)),
      ...base(ctx),
    };
  },
};

const verDia: McpTool = {
  name: "ver_dia",
  title: "Detalhe de um dia",
  kind: "read",
  description:
    "Um dia específico: tipo, meta, atestado, trabalhado, saldo do dia e (com o Clockify conectado) as tarefas e projetos em que as horas foram lançadas. Padrão: hoje.",
  inputSchema: {
    type: "object",
    properties: { data: { type: "string", description: "Dia (AAAA-MM-DD). Padrão: hoje." } },
  },
  async run(args, { username }) {
    const ctx = await carregarContexto(username);
    const d = argDia(args, "data", ctx.hoje);
    const linha = linhaDoDia(ctx, d);
    let tarefas: unknown = ctx.clockifyOn ? undefined : "Clockify não conectado";
    if (ctx.clockifyOn) {
      try {
        const b = await clockify.breakdown(credsFrom(ctx.user), { start: d, end: d });
        tarefas = b.byTask.map((t) => ({ tarefa: t.name, projeto: t.project ?? null, horas: hm(t.seconds) }));
      } catch (e) {
        tarefas = `Não consegui ler as tarefas no Clockify: ${e instanceof Error ? e.message : e}`;
      }
    }
    return {
      ...linha,
      ...(d === ctx.hoje ? { cronometro: cronometroInfo(ctx) } : {}),
      tarefas,
      ...base(ctx),
    };
  },
};

const cronometro: McpTool = {
  name: "cronometro",
  title: "Cronômetro do Clockify",
  kind: "read",
  description:
    "O que está rodando agora no cronômetro do Clockify (descrição, projeto, tarefa, início e decorrido). Só observa: nunca inicia nem para nada.",
  inputSchema: { type: "object", properties: {} },
  async run(_args, { username }) {
    const ctx = await carregarContexto(username);
    if (!ctx.clockifyOn) return { rodando: false, observacao: "Clockify não conectado." };
    return cronometroInfo(ctx) ?? { rodando: false };
  },
};

const AGRUPAMENTOS = { projeto: "byProject", cliente: "byClient", tarefa: "byTask" } as const;

const relatorio: McpTool = {
  name: "relatorio_de_horas",
  title: "Horas por projeto, cliente ou tarefa",
  kind: "read",
  description:
    "Relatório do Clockify num período, agrupado por projeto, cliente ou tarefa, com horas e percentual (inclui o cronômetro rodando). Padrão: mês atual, por projeto, 15 itens. Use para \"em que gastei mais tempo?\", \"quantas horas no projeto X este mês?\".",
  inputSchema: {
    type: "object",
    properties: {
      de: { type: "string", description: "Início (AAAA-MM-DD). Padrão: dia 1 do mês atual." },
      ate: { type: "string", description: "Fim (AAAA-MM-DD). Padrão: hoje." },
      agrupar_por: { type: "string", enum: ["projeto", "cliente", "tarefa"], description: "Padrão: projeto." },
      limite: { type: "integer", minimum: 1, maximum: 100, description: "Máximo de itens. Padrão: 15." },
    },
  },
  async run(args, { username }) {
    const ctx = await carregarContexto(username, { aoVivo: false });
    if (!ctx.clockifyOn) return { observacao: "Clockify não conectado: não há relatório por projeto." };
    const de = argDia(args, "de", `${ctx.hoje.slice(0, 7)}-01`);
    const ate = argDia(args, "ate", ctx.hoje);
    if (de > ate) throw new ToolInputError('"de" deve ser antes de "ate".');
    const grupo = (typeof args.agrupar_por === "string" ? args.agrupar_por : "projeto") as keyof typeof AGRUPAMENTOS;
    if (!(grupo in AGRUPAMENTOS)) throw new ToolInputError('"agrupar_por" deve ser projeto, cliente ou tarefa.');
    const limite = Math.min(100, Math.max(1, Number(args.limite) || 15));

    const b = await clockify.breakdown(credsFrom(ctx.user), { start: de, end: ate });
    const fatias = b[AGRUPAMENTOS[grupo]];
    const pct = (sec: number) => (b.totalSec ? `${((sec / b.totalSec) * 100).toFixed(1)}%` : "0%");
    const top = fatias.slice(0, limite);
    const resto = fatias.slice(limite).reduce((a, f) => a + f.seconds, 0);
    return {
      periodo: { de, ate },
      total: hm(b.totalSec),
      lancamentos: b.entries,
      agrupado_por: grupo,
      itens: top.map((f) => ({
        nome: f.name,
        ...(f.client ? { cliente: f.client } : {}),
        ...(f.project ? { projeto: f.project } : {}),
        horas: hm(f.seconds),
        percentual: pct(f.seconds),
      })),
      ...(resto > 0 ? { outros: { itens: fatias.length - limite, horas: hm(resto), percentual: pct(resto) } } : {}),
      fonte: "Clockify ao vivo",
    };
  },
};

const calendario: McpTool = {
  name: "calendario",
  title: "Jornada, feriados, férias e atestados",
  kind: "read",
  description:
    "Configuração e calendário do banco: vigências de jornada (meta diária e dias da semana), início do contrato e do banco, feriados, períodos de férias, atestados e dias presenciais no período. Padrão: o ano atual.",
  inputSchema: {
    type: "object",
    properties: {
      de: { type: "string", description: "Início (AAAA-MM-DD). Padrão: 1º de janeiro do ano atual." },
      ate: { type: "string", description: "Fim (AAAA-MM-DD). Padrão: 31 de dezembro do ano atual." },
    },
  },
  async run(args, { username }) {
    const ctx = await carregarContexto(username, { aoVivo: false });
    const ano = ctx.hoje.slice(0, 4);
    const de = argDia(args, "de", `${ano}-01-01`);
    const ate = argDia(args, "ate", `${ano}-12-31`);
    const s = ctx.state;
    const no = (d: string) => d >= de && d <= ate;
    const inicioContrato = s.jornadas[0]?.desde;
    const presenciais = Object.keys(s.presencial || {}).filter((d) => s.presencial[d] && no(d)).sort();
    return {
      periodo: { de, ate },
      jornadas: s.jornadas.map((j) => ({
        desde: j.desde === "0000-01-01" ? "sempre" : j.desde,
        meta_diaria: fmtJornada(j.metaDiaSec),
        dias: j.diasSemana.map((d) => SEMANAS[d]).join("/"),
      })),
      inicio_do_contrato: inicioContrato && inicioContrato !== "0000-01-01" ? inicioContrato : null,
      inicio_do_banco: s.inicioBanco ?? null,
      feriados: Object.entries(s.feriados)
        .filter(([d]) => no(d))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, nome]) => ({ data, dia_semana: diaSemana(data), nome })),
      ferias: agruparPeriodos(Object.keys(s.ferias || {}).filter((d) => s.ferias[d] && no(d))),
      atestados: Object.entries(s.atestados || {})
        .filter(([d, sec]) => no(d) && sec > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, sec]) => ({ data, horas: hm(sec) })),
      dias_presenciais: { quantidade: presenciais.length, dias: presenciais },
    };
  },
};

export const LEITURA: McpTool[] = [resumo, saldoPorMes, extrato, verDia, cronometro, relatorio, calendario];
