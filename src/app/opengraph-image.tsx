import { ImageResponse } from "next/og";

export const alt = "GableMath — Measure once. Buy right.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(<OgCard eyebrow="gablemath.com" title="Measure once. Buy right." sub="Free, source-checked calculators for home projects and energy costs." />, size);
}

export function OgCard({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3f2ee", padding: 56, fontFamily: "serif" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          borderRadius: 44,
          padding: "56px 64px",
          boxShadow: "0 30px 60px -30px rgba(16,18,24,0.35)",
          border: "1px solid rgba(21,22,26,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#15161a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none" stroke="#f3f2ee" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 15.2 16 6.2l10.5 9" />
              <path d="M9.6 20.6h12.8M9.6 26h12.8" />
            </svg>
          </div>
          <div style={{ fontSize: 40, color: "#15161a", fontWeight: 700, letterSpacing: -1 }}>GableMath</div>
          <div style={{ marginLeft: "auto", fontSize: 24, color: "#868992", fontFamily: "sans-serif" }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 40 ? 64 : 80, lineHeight: 1.05, color: "#15161a", fontWeight: 700, letterSpacing: -2 }}>{title}</div>
          <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, color: "#484b53", fontFamily: "sans-serif" }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}
