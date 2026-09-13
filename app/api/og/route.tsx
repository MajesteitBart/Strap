import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/marketing/brand";

export const runtime = "edge";

const block = (background: string, borderRadius: string) => ({
  width: 86,
  height: 86,
  background,
  border: "2px solid #211e19",
  borderRadius,
});

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fbf6ee",
        color: "#211e19",
        padding: "72px 84px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>
          {BRAND_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 68, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3 }}>
          {BRAND_TAGLINE}
        </div>
        <div style={{ display: "flex", marginTop: 38, gap: 12 }}>
          {["Context", "Skills", "Keys"].map((label, index) => (
            <div
              key={label}
              style={{
                display: "flex",
                border: "2px solid #211e19",
                background: ["#dfe6fb", "#ffe6d6", "#e9e2fb"][index],
                padding: "10px 16px",
                fontSize: 20,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", width: 190, gap: 14 }}>
        <div style={block("#2852db", "42px 0 42px 0")} />
        <div style={block("#f47621", "0 42px 0 0")} />
        <div style={block("#805fe7", "0 0 0 42px")} />
        <div style={block("#ffc842", "52px 0 0 0")} />
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
