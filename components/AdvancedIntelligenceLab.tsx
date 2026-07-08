"use client";

import { Activity, Brain, Target, Mic, TrendingUp, Hash } from "lucide-react";
import { PersonalityAnalysis } from "@/lib/types";

export default function AdvancedIntelligenceLab({ analysis }: { analysis: PersonalityAnalysis }) {
  const metrics = analysis.advancedMetrics;

  if (!metrics) {
    return (
      <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Las métricas avanzadas de Laboratorio no están disponibles para esta medición (Versión anterior).
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Activity size={18} color="var(--accent-primary)" />
        <h3 style={{ fontFamily: "Outfit", fontSize: "1.4rem", fontWeight: 800 }}>
          Laboratorio de Inteligencia Avanzada
        </h3>
      </div>

      <div className="responsive-grid-2" style={{ gap: "1rem" }}>
        {/* Disonancia Cognitiva */}
        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "3px solid #f43f5e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Brain size={16} color="#f43f5e" />
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Disonancia Cognitiva</h4>
          </div>
          <div style={{ fontSize: "2rem", fontFamily: "Outfit", fontWeight: 900, color: "#f43f5e", marginBottom: "0.5rem" }}>
            {metrics.cognitiveDissonance.gap}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {metrics.cognitiveDissonance.explanation}
          </div>
        </div>

        {/* Contagio Narrativo */}
        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "3px solid #a855f7" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Hash size={16} color="#a855f7" />
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Índice de Contagio</h4>
          </div>
          <div style={{ fontSize: "2rem", fontFamily: "Outfit", fontWeight: 900, color: "#a855f7", marginBottom: "0.5rem" }}>
            {metrics.narrativeContagion.index}/100
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {metrics.narrativeContagion.explanation}
          </div>
        </div>

        {/* Sincronía Emocional */}
        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "3px solid #3b82f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Target size={16} color="#3b82f6" />
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Sincronía Emocional Federal</h4>
          </div>
          <div style={{ fontSize: "2rem", fontFamily: "Outfit", fontWeight: 900, color: "#3b82f6", marginBottom: "0.5rem" }}>
            {metrics.emotionalSynchrony.score}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
            {metrics.emotionalSynchrony.explanation}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {metrics.emotionalSynchrony.regions.map(r => (
              <span key={r} style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", padding: "0.2rem 0.5rem", borderRadius: "100px", fontSize: "0.65rem", fontWeight: 600 }}>
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Agenda Dura & Altavoces */}
        <div className="glass-card" style={{ padding: "1.25rem", borderTop: "3px solid #f59e0b", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <TrendingUp size={16} color="#f59e0b" />
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>Correlación Agenda Dura</h4>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {metrics.hardAgendaCorrelation}
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Mic size={14} color="var(--text-muted)" />
              <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Ecosistema de Altavoces</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {metrics.amplifiers.map((amp, i) => <li key={i} style={{ marginBottom: "0.2rem" }}>{amp}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
