import { ImageResponse } from "next/og";

export const alt = "H_Log — banco de horas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Card de preview (WhatsApp/Twitter/etc.) — logo H_Log sobre fundo escuro.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          background: "linear-gradient(135deg, #0b0d12, #12151e)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
              width: 150,
              height: 150,
              borderRadius: 32,
              background: "#0d0f14",
              border: "3px solid #232838",
              padding: "0 30px",
            }}
          >
            <div style={{ display: "flex", width: 80, height: 15, borderRadius: 8, background: "#00ff88" }} />
            <div style={{ display: "flex", width: 52, height: 15, borderRadius: 8, background: "#00ff88", opacity: 0.8 }} />
            <div style={{ display: "flex", width: 66, height: 15, borderRadius: 8, background: "#00ff88", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
            <span style={{ color: "#00ff88" }}>H</span>
            <span style={{ color: "#6b7280" }}>_</span>
            <span style={{ color: "#ffffff" }}>Log</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#9aa2ac" }}>
          Banco de horas · saldo por usuário
        </div>
      </div>
    ),
    { ...size },
  );
}
