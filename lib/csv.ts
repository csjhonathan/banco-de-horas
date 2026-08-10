// Parser do CSV de "Relatório Detalhado" do Clockify -> registros por dia.
// Portado de public/index.html (tolerante a aspas/vírgulas dentro de campos).

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inq = false;
      } else field += c;
    } else {
      if (c === '"') inq = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c !== "\r") field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normDate(s: string): string | null {
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // DD/MM/YYYY (Clockify BR)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function clockifyCSVtoRegistros(text: string): Record<string, number> {
  const rows = parseCSV(text).filter((r) => r.length > 1);
  if (!rows.length) throw new Error("csv vazio");
  const header = rows[0].map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  const idxOf = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const dIdx = idxOf(["data de início", "data de inicio", "start date"]);
  const hmsIdx = idxOf(["duração (h)", "duracao (h)", "duration (h)"]);
  const decIdx = idxOf(["duração (decimal)", "duracao (decimal)", "duration (decimal)"]);
  if (dIdx < 0 || (hmsIdx < 0 && decIdx < 0)) throw new Error("colunas nao encontradas");
  const reg: Record<string, number> = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[dIdx]) continue;
    const day = normDate(r[dIdx]);
    if (!day) continue;
    let sec = 0;
    if (hmsIdx >= 0 && r[hmsIdx] && r[hmsIdx].includes(":")) {
      const p = r[hmsIdx].split(":").map((n) => parseInt(n, 10) || 0);
      sec = (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
    } else if (decIdx >= 0 && r[decIdx]) {
      sec = Math.round((parseFloat(String(r[decIdx]).replace(",", ".")) || 0) * 3600);
    }
    if (sec > 0) reg[day] = (reg[day] || 0) + sec;
  }
  return reg;
}
