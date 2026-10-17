import { ImageResponse } from "next/og";
import { siteConfig } from "./site";

export const ogSize = { width: 1200, height: 630 };

function Mark({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="9" fill="#ffffff" />
      <path d="M10 13h14M10 20h10M10 27h7" stroke="#37507f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M21 29l5-6 3.5 3L33 15" fill="none" stroke="#1f8049" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function renderOgImage({ eyebrow, title, footer }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0b1426 0%, #142039 55%, #1f2f4f 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Mark />
          <div style={{ fontSize: 36, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && (
            <div style={{ fontSize: 26, color: "#b3e4c6", textTransform: "uppercase", letterSpacing: 3 }}>
              {eyebrow}
            </div>
          )}
          <div style={{ fontSize: title.length > 70 ? 54 : 64, fontWeight: 700, lineHeight: 1.12, maxWidth: 1000 }}>
            {title}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#c6d2e6" }}>
          <div>{footer || siteConfig.tagline}</div>
          <div style={{ display: "flex", width: 120, height: 6, background: "#2f9e5f", borderRadius: 3, marginTop: 12 }} />
        </div>
      </div>
    ),
    ogSize
  );
}

export function renderSquareMark(size) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#142039" }}>
        <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 40 40">
          <path d="M8 11h16M8 20h11M8 29h7" stroke="#c6d2e6" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 31l6-7.5 4 3.5L35 13" fill="none" stroke="#2f9e5f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
