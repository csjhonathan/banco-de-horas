import { NextResponse } from "next/server";
import { getState, getUser, putState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { seed } from "@/lib/seed";
import { rangeDias } from "@/lib/horas";

// Sync (pull). O Clockify é a fonte da verdade; o app só LÊ de lá.
export async function POST(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user?.clockify) {
    return NextResponse.json({ error: "Clockify nao configurado." }, { status: 400 });
  }
  const { start, end } = (await req.json().catch(() => ({}))) || {};
  const state = (await getState(username)) || seed();
  const result = await clockify.syncRange(credsFrom(user), { start, end });
  // Sync AUTORITATIVO no período: o app passa a espelhar o Clockify no intervalo
  // inteiro, sem exceções. Dia com entrada -> grava o valor; dia SEM entrada ->
  // apaga o registro velho. Assim reimportar um período o deixa idêntico ao
  // Clockify (limpa dias que perderam entradas por edição/apagamento ou import
  // errado). O saldo de mês fechado é congelado em `fechados[].trab`, então
  // continua intacto mesmo que os `registros` daquele mês mudem aqui.
  for (const day of rangeDias(result.range.start, result.range.end)) {
    if (day in result.registros) state.registros[day] = result.registros[day];
    else delete state.registros[day];
  }
  await putState(username, state);
  return NextResponse.json({
    state,
    days: result.days,
    count: result.count,
    range: result.range,
  });
}
