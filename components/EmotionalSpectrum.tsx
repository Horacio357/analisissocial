"use client";

import { PersonalityAnalysis } from "@/lib/types";
import { AlertCircle, Heart, Flame, ShieldAlert, Sparkles, BatteryWarning } from "lucide-react";

interface EmotionalSpectrumProps {
  analysis: PersonalityAnalysis;
}

export default function EmotionalSpectrum({ analysis }: EmotionalSpectrumProps) {
  if (!analysis.emotions) return null;

  const { fear, anger, hope, pride, fatigue } = analysis.emotions;

  const renderBar = (label: string, value: number, color: string, icon: React.ReactNode) => {
    // Normalizamos el valor al 100% y lo redondeamos
    const val = Math.max(0, Math.min(100, Math.round(value)));
    
    return (
      <div style={{ marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ color }}>{icon}</span>
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
          </div>
          <span style={{ fontSize: "0.75rem", fontFamily: "Outfit", fontWeight: 700, color }}>{val}%</span>
        </div>
        <div className="progress-bar" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
          <div style={{
            height: "100%", width: `${val}%`,
            background: `linear-gradient(90deg, ${color}40, ${color})`,
            borderRadius: "4px", transition: "width 1s ease"
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: "1rem",
      background: "rgba(0,0,0,0.2)",
      borderRadius: "var(--radius-md)",
      border: "1px solid rgba(255,255,255,0.05)",
      marginBottom: "1rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem" }}>
        <Sparkles size={14} color="#a78bfa" />
        <h4 style={{ fontSize: "0.85rem", fontFamily: "Outfit", fontWeight: 700, color: "var(--text-primary)" }}>
          Espectro Emocional
        </h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Columna: Emociones de Tensión */}
        <div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Tensión (Crisis)
          </div>
          {renderBar("Miedo / Incertid.", fear, "#f59e0b", <ShieldAlert size={12} />)}
          {renderBar("Enojo / Bronca", anger, "#ef4444", <Flame size={12} />)}
        </div>

        {/* Columna: Emociones de Anclaje */}
        <div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Anclaje (Consenso)
          </div>
          {renderBar("Esperanza", hope, "#34d399", <Heart size={12} />)}
          {renderBar("Orgullo", pride, "#3b82f6", <Sparkles size={12} />)}
        </div>
      </div>

      {/* Barra de fatiga (inferior) */}
      <div style={{
        marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <BatteryWarning size={14} color={fatigue > 70 ? "#ef4444" : "#a78bfa"} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>Fatiga Social:</span>
        </div>
        <div style={{ flex: 1 }}>
          <div className="progress-bar" style={{ height: "6px", background: "rgba(255,255,255,0.05)" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, fatigue)}%`,
              background: fatigue > 70 ? "linear-gradient(90deg, #f87171, #ef4444)" : "linear-gradient(90deg, #c084fc, #a78bfa)",
              borderRadius: "4px", transition: "width 1s ease"
            }} />
          </div>
        </div>
        <span style={{ fontSize: "0.75rem", fontFamily: "Outfit", fontWeight: 800, color: fatigue > 70 ? "#ef4444" : "var(--text-secondary)" }}>
          {Math.round(fatigue)}%
        </span>
      </div>
    </div>
  );
}
