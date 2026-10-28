import { NextResponse } from "next/server";
import { getState, getUser, putState } from "@/lib/db";
import { currentUsername } from "@/lib/session";
import { credsFrom } from "@/lib/user";
import * as clockify from "@/lib/clockify";
import { seed } from "@/lib/seed";

// Import (substituição DENTRO da janela). Diferente do /sync (que só
// sobrescreve os dias devolvidos), aqui o período [start, end] passa a ser
// exatamente o que o Clockify tem: dias da janela sem entrada no Clockify são
// apagados. Fora da janela NADA é tocado — importar um dia/mês não mexe no
// resto do banco. O Clockify é somente-leitura e a fonte da verdade, então
// reimportar um período sempre o reconstrói.
//
// `apagarFora: true` (opt-in explícito do usuário no diálogo, nunca usado por
// nada automático) também apaga os lançamentos FORA da janela — o banco passa
// a ter só o período importado. Só mexe em `registros`: jornadas, férias,
// atestados, feriados, presença e meses fechados ficam intactos.
export async function POST(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const user = await getUser(username);
  if (!user?.clockify) {
    return NextResponse.json({ error: "Clockify nao configurado." }, { status: 400 });
  }
  const { start, end, apagarFora } = (await req.json().catch(() => ({}))) || {};
  const state = (await getState(username)) || seed();
  const result = await clockify.syncRange(credsFrom(user), { start, end });
  // Limpa só os dias dentro da janela e aplica o que o Clockify devolveu
  // (chaves de result.registros são todas dentro de [start, end]). Datas são
  // "AAAA-MM-DD", então comparação lexicográfica = cronológica.
  const { start: from, end: to } = result.range;
  let removidosFora = 0;
  for (const day of Object.keys(state.registros)) {
    const dentro = day >= from && day <= to;
    if (dentro) delete state.registros[day];
    else if (apagarFora === true) {
      delete state.registros[day];
      removidosFora++;
    }
  }
  Object.assign(state.registros, result.registros);
  await putState(username, state);
  return NextResponse.json({
    state,
    days: result.days,
    count: result.count,
    range: result.range,
    removidosFora,
  });
}
