"use client";

import { PersonalityAnalysis } from "@/lib/types";
import { ARCHETYPE_CONFIG, sentimentToColor, sentimentToLabel, sentimentToPercent, timeAgo, isAnalysisExpired } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Star, Clock, Tag, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import RadarChart from "./RadarChart";
import ShareCard from "./ShareCard";
import EmotionalSpectrum from "./EmotionalSpectrum";

interface PersonalityCardProps {
  analysis: PersonalityAnalysis;
  onReanalyze?: (name: string) => void;
  isPremium?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  politica: "Política",
  deportes: "Deportes",
  social: "Social",
  entretenimiento: "Entretenimiento",
  cultura: "Cultura",
};

export default function PersonalityCard({ analysis, onReanalyze, isPremium = false }: PersonalityCardProps) {
  const archConf = ARCHETYPE_CONFIG[analysis.archetype];
  const expired = isAnalysisExpired(analysis.analyzedAt, isPremium);
  const sentColor = sentimentToColor(analysis.sentimentOverall);
  const sentPct = sentimentToPercent(analysis.sentimentOverall);

  const TrendIcon = analysis.trend === "rising" ? TrendingUp : analysis.trend === "falling" ? TrendingDown : Minus;
  const trendColor = analysis.trend === "rising" ? "#34d399" : analysis.trend === "falling" ? "#f97316" : "var(--text-muted)";

  return (
    <div className="glass-card animate-fade-up" style={{
      border: `1px solid ${archConf.color}25`,
      position: "relative",
      overflow: "visible",
    }}>
      {/* Glow top border */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "20%",
        right: "20%",
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${archConf.color}, transparent)`,
        borderRadius: "1px",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            <span className={`badge badge-${analysis.archetype}`}>
              {archConf.emoji} {archConf.label}
            </span>
            <span style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              padding: "0.2rem 0.5rem",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "4px",
            }}>
              {CATEGORY_LABELS[analysis.category] || analysis.category}
            </span>
            {(analysis as PersonalityAnalysis & { aiPowered?: boolean }).aiPowered && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.25rem",
                fontSize: "0.62rem", fontWeight: 700, color: "#a78bfa",
                padding: "0.15rem 0.45rem",
                background: "rgba(167,139,250,0.12)",
                border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: "100px",
              }}>
                <Sparkles size={9} /> IA Gemini
              </span>
            )}
          </div>
          <h2 style={{ fontFamily: "Outfit", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1, color: "var(--text-primary)" }}>
            {analysis.name}
          </h2>
        </div>

        {/* Score del arquetipo */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: `2px solid ${archConf.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${archConf.color}12`,
            boxShadow: `0 0 16px ${archConf.color}25`,
          }}>
            <span style={{ fontSize: "1.1rem", fontFamily: "Outfit", fontWeight: 800, color: archConf.color }}>
              {analysis.archetypeScore}
            </span>
          </div>
          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", display: "block", marginTop: "0.2rem" }}>confianza</span>
        </div>
      </div>

      {/* Sentimiento global */}
      <div style={{
        padding: "0.875rem 1rem",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(255,255,255,0.05)",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Sentimiento Global
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <TrendIcon size={13} color={trendColor} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "Outfit", color: sentColor }}>
              {sentimentToLabel(analysis.sentimentOverall)}
            </span>
          </div>
        </div>
        <div className="progress-bar" style={{ height: "6px" }}>
          <div
            className="progress-fill"
            style={{
              width: `${sentPct}%`,
              background: `linear-gradient(90deg, #ef4444 0%, #6b7280 50%, #10b981 100%)`,
              transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Muy neg.</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Muy pos.</span>
        </div>
      </div>

      {/* Resumen y razonamiento del arquetipo */}
      <p style={{
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        lineHeight: 1.65,
        marginBottom: (analysis as PersonalityAnalysis & { archetypeReasoning?: string }).archetypeReasoning ? "0.6rem" : "1rem",
        borderLeft: `2px solid ${archConf.color}50`,
        paddingLeft: "0.75rem",
      }}>
        {analysis.summary}
      </p>

      {/* Razonamiento del arquetipo (solo con Gemini) */}
      {(analysis as PersonalityAnalysis & { archetypeReasoning?: string }).archetypeReasoning && (
        <div style={{
          padding: "0.6rem 0.75rem",
          background: `${archConf.color}08`,
          border: `1px solid ${archConf.color}20`,
          borderRadius: "var(--radius-sm)",
          marginBottom: "0.75rem",
          display: "flex", alignItems: "flex-start", gap: "0.4rem",
        }}>
          <Sparkles size={12} color={archConf.color} style={{ flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
            <strong style={{ color: archConf.color }}>Por qué {archConf.label}:</strong>{" "}
            {(analysis as PersonalityAnalysis & { archetypeReasoning?: string }).archetypeReasoning}
          </p>
        </div>
      )}

      {/* Narrativas detectadas por Gemini */}
      {(analysis as PersonalityAnalysis & { narratives?: { positive: string[]; negative: string[] } }).narratives && (() => {
        const narr = (analysis as PersonalityAnalysis & { narratives: { positive: string[]; negative: string[] } }).narratives;
        return (
          <div className="responsive-grid-2" style={{ gap: "0.5rem", marginBottom: "1rem" }}>
            {narr.positive?.length > 0 && (
              <div style={{
                padding: "0.6rem", background: "rgba(52,211,153,0.05)",
                border: "1px solid rgba(52,211,153,0.15)", borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.35rem" }}>
                  <ThumbsUp size={11} color="#34d399" />
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.06em" }}>Narrativa favorable</span>
                </div>
                {narr.positive.slice(0,2).map((n,i) => (
                  <p key={i} style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.2rem" }}>· {n}</p>
                ))}
              </div>
            )}
            {narr.negative?.length > 0 && (
              <div style={{
                padding: "0.6rem", background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.35rem" }}>
                  <ThumbsDown size={11} color="#f87171" />
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em" }}>Narrativa crítica</span>
                </div>
                {narr.negative.slice(0,2).map((n,i) => (
                  <p key={i} style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "0.2rem" }}>· {n}</p>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Espectro Emocional */}
      <EmotionalSpectrum analysis={analysis} />

      {/* Radar Chart */}
      <div style={{ marginBottom: "1rem" }}>
        <RadarChart analysis={analysis} size={260} />
      </div>

      {/* Keywords */}
      {analysis.keywords.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <Tag size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Palabras clave
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {analysis.keywords.slice(0, 6).map((kw, i) => (
              <span key={i} style={{
                padding: "0.2rem 0.6rem",
                background: `${archConf.color}12`,
                border: `1px solid ${archConf.color}30`,
                borderRadius: "100px",
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "0.75rem",
        borderTop: "1px solid var(--glass-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Clock size={12} color={expired ? "#f97316" : "var(--text-muted)"} />
          <span style={{ fontSize: "0.72rem", color: expired ? "#f97316" : "var(--text-muted)" }}>
            {timeAgo(analysis.analyzedAt)}
          </span>
          {expired && (
            <span style={{
              fontSize: "0.65rem",
              padding: "0.15rem 0.4rem",
              background: "rgba(249,115,22,0.12)",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: "4px",
              color: "#f97316",
            }}>
              Análisis expirado
            </span>
          )}
        </div>

        {expired && onReanalyze && (
          <button
            onClick={() => onReanalyze(analysis.name)}
            className="btn-ghost"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem", gap: "0.35rem" }}
          >
            <RefreshCw size={12} />
            Reanalizar
          </button>
        )}

        <ShareCard analysis={analysis} />

        {!isPremium && !expired && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Star size={11} color="#f59e0b" />
            <span style={{ fontSize: "0.7rem", color: "#f59e0b" }}>Premium: actualizar diario</span>
          </div>
        )}
      </div>
    </div>
  );
}
