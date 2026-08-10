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
}

/** O estado do banco de horas — também usado no backup/restore. */
export interface State {
  feriadosVersion: number;
  metaDiaSec: number;
  diasSemana: number[]; // dias trabalhados (0=dom … 6=sáb)
  fechados: MesFechado[];
  registros: Record<string, number>; // "AAAA-MM-DD" -> segundos trabalhados
  feriados: Record<string, string>; // "AAAA-MM-DD" -> nome
  atestados: Record<string, number>; // "AAAA-MM-DD" -> segundos creditados
  presencial: Record<string, boolean>; // "AAAA-MM-DD" -> foi ao escritório
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

/** Resposta de /api/me. */
export interface MeResponse {
  username: string;
  clockify: ClockifyPublic;
  webhookUrl: string;
  allowRegister: boolean;
}
