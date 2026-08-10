import { NextResponse } from "next/server";
import { currentUsername } from "@/lib/session";

// Geocoding de endereço -> lat/lng via Nominatim (OpenStreetMap), sem chave.
// Protegido por sessão para não virar proxy aberto.
export async function GET(req: Request) {
  const username = await currentUsername();
  if (!username) {
    return NextResponse.json({ error: "nao autenticado" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "informe um endereço" }, { status: 422 });
  }
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "H_Log/1.0 (banco de horas pessoal)" },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "falha na busca de endereço" }, { status: 502 });
  }
  const arr = await r.json();
  if (!Array.isArray(arr) || !arr.length) {
    return NextResponse.json({ error: "endereço não encontrado" }, { status: 404 });
  }
  const { lat, lon, display_name } = arr[0];
  return NextResponse.json({ lat: Number(lat), lng: Number(lon), label: display_name });
}
