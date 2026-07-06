"use client";

import { TOP_20_PERSONALITIES } from "@/lib/top20";
import { ARCHETYPE_CONFIG } from "@/lib/utils";
import { PersonalityAnalysis } from "@/lib/types";

interface Top20RankingProps {
  onSelectPersonality: (p: PersonalityAnalysis) => void;
}

export default function Top20Ranking({ onSelectPersonality }: Top20RankingProps) {
  return (
    <div className="glass-card" style={{ marginTop: "2rem", width: "100%" }}>
      <div className="section-label">Ranking de Impacto</div>
      <h3 style={{ fontFamily: "Outfit", fontSize: "1.2rem", marginBottom: "1.5rem" }}>
        Top 20 Personalidades Analizadas
      </h3>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "1rem"
      }}>
        {TOP_20_PERSONALITIES.map((p, idx) => {
          const arch = ARCHETYPE_CONFIG[p.archetype];
          return (
            <div 
              key={p.id}
              onClick={() => onSelectPersonality(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = `${arch.color}50`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)";
              }}
            >
              <div style={{
                width: "24px",
                fontFamily: "Outfit",
                fontWeight: 900,
                color: idx < 3 ? "var(--accent-primary)" : "var(--text-muted)",
                fontSize: "1.1rem"
              }}>
                #{idx + 1}
              </div>
              <div style={{ fontSize: "1.5rem" }}>{arch.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.7rem", color: arch.color }}>
                  {arch.label}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  {p.metrics.resonance}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>Impacto</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
