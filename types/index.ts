// Tipos compartilhados do Banco de Horas.

/** Secrets de webhook por slot (upd = atualizada, new = criada, del = excluída). */
export interface WebhookSecrets {
  upd?: string;
  new?: string;
  del?: string;
}

/** Integração Clockify de um usuário (somente leitura). */
export interface ClockifyConfig {
  apiKey: string;
  workspaceId: string;
  userId: string;
  name?: string;
  email?: string;
  webhookSecrets?: WebhookSecrets | string[];
}

/** Um mês consolidado (saldo fechado, sem lançamento dia a dia). */
export interface MesFechado {
  ym: string; // "AAAA-MM"
  dias: number; // dias úteis
  trab: number; // total trabalhado em segundos
  metaSec?: number; // meta congelada no fechamento (segundos). Se ausente, é
  // derivada de dias × jornada vigente no mês (compat com fechados antigos).
}

/**
 * Uma vigência de jornada — vale a partir de `desde` (inclusive) até a próxima
 * vigência começar. Permite que a jornada mude ao longo do tempo (ex.: promoção
 * de 6h/dia para 8h/dia). A lista em `State.jornadas` fica ordenada por `desde`.
 */
export interface Jornada {
  desde: string; // "AAAA-MM-DD" — início da vigência (inclusive)
  metaDiaSec: number; // meta diária em segundos
  diasSemana: number[]; // dias trabalhados (0=dom … 6=sáb)
}

/** Local do escritório para o check-in por GPS. */
export interface EscritorioConfig {
  lat: number;
  lng: number;
  raioM: number; // raio de tolerância em metros
  label?: string;
}

/** O estado do banco de horas — também usado no backup/restore. */
export interface State {
  feriadosVersion: number;
  /**
   * Vigências de jornada ordenadas por `desde`. Fonte da verdade do cálculo:
   * cada dia usa a última vigência cujo `desde <= dia`. `migrate` garante ao
   * menos uma vigência.
   */
  jornadas: Jornada[];
  /**
   * Espelho da vigência ATUAL (jornada de hoje), mantido em sincronia com
   * `jornadas` para leituras simples de "jornada atual" (TopBar etc.) e compat
   * com backups antigos. Não é a fonte da verdade — o cálculo histórico usa
   * `jornadas`.
   */
  metaDiaSec: number;
  diasSemana: number[]; // dias trabalhados (0=dom … 6=sáb)
  fechados: MesFechado[];
  registros: Record<string, number>; // "AAAA-MM-DD" -> segundos trabalhados
  feriados: Record<string, string>; // "AAAA-MM-DD" -> nome
  atestados: Record<string, number>; // "AAAA-MM-DD" -> segundos creditados
  presencial: Record<string, boolean>; // "AAAA-MM-DD" -> foi ao escritório
  ferias: Record<string, boolean>; // "AAAA-MM-DD" -> dia de férias (não conta meta/débito)
  escritorio: EscritorioConfig | null;
}

/** Documento do usuário no Mongo (um por usuário). */
export interface UserDoc {
  _id: string; // username
  salt: string;
  hash: string;
  createdAt: Date;
  updatedAt?: Date;
  clockify: ClockifyConfig | null;
  data: State;
}

/** Visão pública da integração Clockify (sem a apiKey). */
export interface ClockifyPublic {
  configured: boolean;
  workspaceId?: string;
  name?: string;
  email?: string;
  apiKeySaved?: boolean;
  webhookSlots?: { upd: boolean; new: boolean; del: boolean };
  webhookSecretsCount?: number;
  webhookConfigured?: boolean;
}

/**
 * Cronômetro em andamento no Clockify (time entry sem `end`). SOMENTE LEITURA —
 * o app só observa o timer, nunca inicia/para nada no Clockify.
 */
export interface RunningEntry {
  id: string;
  description: string;
  projectName: string | null;
  projectColor: string | null;
  taskName: string | null;
  billable: boolean;
  start: string; // ISO do início
  elapsedSec: number; // decorrido calculado no servidor no momento do fetch
}

/** Resposta de /api/clockify/running. */
export interface RunningResult {
  running: RunningEntry | null;
  serverNow: number; // Date.now() do servidor (ms) — corrige clock skew do cliente
  error?: string;
}

/** Resposta de /api/me. */
export interface MeResponse {
  username: string;
  clockify: ClockifyPublic;
  webhookUrl: string;
  allowRegister: boolean;
}
