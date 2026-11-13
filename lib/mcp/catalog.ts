// Catálogo do MCP: leituras + escritas (em dois passos) + confirmar_acao.
import { confirmarAcao } from "./acoes";
import { ESCRITA } from "./escrita";
import { LEITURA } from "./leitura";
import { ToolInputError, type McpTool } from "./shared";

export { ToolInputError };
export type { McpTool };

const confirmar: McpTool = {
  name: "confirmar_acao",
  title: "Confirmar ação",
  kind: "write",
  description:
    'Grava uma mudança que outra ferramenta preparou (lancar_horas, apagar_lancamentos, registrar_atestado, marcar_ferias, marcar_presencial), com o token_de_confirmacao que ela devolveu. Só chame DEPOIS de mostrar a prévia e a pessoa dizer "sim" explicitamente. O token vale uma vez, por 10 minutos.',
  inputSchema: {
    type: "object",
    properties: { token: { type: "string", description: "O token_de_confirmacao da prévia." } },
    required: ["token"],
  },
  async run(args, quem) {
    if (typeof args.token !== "string" || !args.token) throw new ToolInputError("Informe o token_de_confirmacao.");
    try {
      const feito = await confirmarAcao(args.token, quem);
      return {
        feito: true,
        acao: feito.resumo,
        observacao: "Gravado no banco de horas. Se o app estiver aberto, ele atualiza sozinho em até 1 minuto.",
      };
    } catch (e) {
      throw new ToolInputError(e instanceof Error ? e.message : "Falha ao confirmar.");
    }
  },
};

export const TOOLS: McpTool[] = [...LEITURA, ...ESCRITA, confirmar];

/** Segredos que nunca entram na auditoria (o token de confirmação vira "***"). */
export function inputParaAuditoria(name: string, args: Record<string, unknown>) {
  return name === "confirmar_acao" ? { ...args, token: args.token ? "***" : null } : args;
}

export const INSTRUCOES = [
  "Banco de Horas do usuário que autorizou este acesso: as horas trabalhadas comparadas com a jornada dele, mês a mês.",
  "LEITURA: comece por resumo_do_banco (saldo, hoje, quanto falta); saldo_por_mes (linha do tempo); extrato_do_mes e ver_dia (dia a dia); relatorio_de_horas (por projeto/cliente/tarefa, do Clockify); calendario (jornada, feriados, férias, atestados).",
  "ESCRITA (lancar_horas, apagar_lancamentos, registrar_atestado, marcar_ferias, marcar_presencial) acontece em DOIS PASSOS: a ferramenta só devolve uma prévia e um token; mostre a prévia (antes → depois e o efeito no saldo), peça um \"sim\" explícito e só então chame confirmar_acao com o token. Nunca confirme sem o \"sim\".",
  "Para lançar horas vindas de outro sistema (ex.: apontamentos da empresa por outro MCP): mande cada apontamento como veio (data + duração, ou data + início/fim) num único lancar_horas; o servidor soma os do mesmo dia. Dá pra mandar vários dias de uma vez.",
  "Todos os saldos e totais vêm calculados pelo servidor com a regra do app (dia útil passado sem lançamento é débito; férias e feriados não contam; atestado abate a meta do dia). Repasse os números, não refaça as contas.",
  "Durações vêm como HH:MM; saldos com sinal (+ crédito, − débito). O Clockify nunca é alterado por aqui.",
].join("\n");
