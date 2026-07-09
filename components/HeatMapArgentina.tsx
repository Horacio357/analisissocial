"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ARGENTINA_PROVINCES } from "@/lib/argentina-map-data";
import { PersonalityAnalysis, ProvinceMetric } from "@/lib/types";
import { ARCHETYPE_CONFIG, sentimentToColor } from "@/lib/utils";
import ProvinceDetailPanel from "@/components/ProvinceDetailPanel";

interface HeatMapArgentinaProps {
  provinceData?: Record<string, ProvinceMetric>;
  personalityName?: string;
  archetype?: string;
  mode?: "sentiment" | "intensity";
  topic?: string;
  nationalSummary?: string;
  category?: string;
}

interface HoveredProvince {
  id: string;
  name: string;
  capital: string;
  metric: ProvinceMetric;
  x: number;
  y: number;
}

function sentimentToHeatColor(sentiment: number, intensity: number): string {
  // Interpolar entre rojo profundo y verde esmeralda pasando por gris neutro
  const alpha = 0.35 + intensity * 0.55;

  if (sentiment > 0.5) return `rgba(16, 185, 129, ${alpha})`; // verde intenso
  if (sentiment > 0.25) return `rgba(52, 211, 153, ${alpha})`; // verde suave
  if (sentiment > 0.05) return `rgba(110, 231, 183, ${alpha})`; // verde muy suave
  if (sentiment > -0.05) return `rgba(234, 179, 8, ${alpha})`; // amarillo/neutro
  if (sentiment > -0.25) return `rgba(251, 146, 60, ${alpha})`; // naranja
  if (sentiment > -0.5) return `rgba(239, 68, 68, ${alpha})`; // rojo suave
  return `rgba(220, 38, 38, ${alpha})`; // rojo intenso
}

function sentimentToStroke(sentiment: number): string {
  if (sentiment > 0.2) return "rgba(52, 211, 153, 0.6)";
  if (sentiment > -0.2) return "rgba(234, 179, 8, 0.6)";
  return "rgba(239, 68, 68, 0.6)";
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function HeatMapArgentina({ provinceData, personalityName, archetype = "hero", mode = "sentiment", topic, nationalSummary, category }: HeatMapArgentinaProps) {
  const [hovered, setHovered] = useState<HoveredProvince | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getMetric = (id: string): ProvinceMetric | null => {
    return provinceData?.[id] || null;
  };

  const sentimentLabel = (s: number) => {
    if (s > 0.5) return "Muy favorable";
    if (s > 0.2) return "Favorable";
    if (s > -0.2) return "Neutro";
    if (s > -0.5) return "Desfavorable";
    return "Muy desfavorable";
  };

  const nationalAvg = useMemo(() => {
    if (!provinceData) return 0;
    const values = Object.values(provinceData).map(p => p.sentiment);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [provinceData]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div className="section-label">Mapa de Calor Territorial</div>
        <h3 style={{ fontFamily: "Outfit", fontSize: "1rem", color: "var(--text-primary)" }}>
          {personalityName ? `Percepción de ${personalityName}` : "Humor Social · Argentina"}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
          Pasa el cursor sobre una provincia · <span style={{ color: "var(--accent-primary)" }}>Click para análisis detallado IA</span>
        </p>
      </div>

      {/* SVG Mapa */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox="120 88 260 560"
          style={{ width: "100%", height: "auto", maxHeight: "480px" }}
        >
          <defs>
            <filter id="glow-province">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {ARGENTINA_PROVINCES.map(province => {
            const metric = getMetric(province.id);
            const isHovered = hovered?.id === province.id;
            const baseColorHex = ARCHETYPE_CONFIG[archetype as any]?.color || "#34d399";
            
            const getThemedColor = (sentiment: number, intensity: number) => {
              // Convertir sentiment (-1 a 1) a alpha (0.1 a 0.9)
              const normalized = (sentiment + 1) / 2;
              const alpha = 0.15 + (normalized * 0.75) * intensity;
              return hexToRgba(baseColorHex, alpha);
            };

            const fillColor = metric
              ? getThemedColor(metric.sentiment, metric.intensity)
              : "rgba(255, 255, 255, 0.03)";
            const strokeColor = metric
              ? hexToRgba(baseColorHex, 0.5)
              : "rgba(255, 255, 255, 0.08)";

            return (
              <g key={province.id}>
                <path
                  d={province.path}
                  fill={fillColor}
                  stroke={isHovered ? "var(--accent-primary)" : strokeColor}
                  strokeWidth={isHovered ? 2 : 0.8}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    filter: isHovered ? "url(#glow-province)" : "none",
                    transform: isHovered ? "scale(1.02)" : "scale(1)",
                    transformOrigin: `${province.cx}px ${province.cy}px`,
                  }}
                  onMouseEnter={e => {
                    if (metric) {
                      const rect = (e.target as SVGPathElement).getBoundingClientRect();
                      setHovered({
                        id: province.id,
                        name: province.name,
                        capital: province.capital,
                        metric,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (topic || personalityName) {
                      setSelectedProvince({ id: province.id, name: province.name });
                    }
                  }}
                />
                {/* Labels de TODAS las provincias */}
                {(() => {
                  // Abreviaciones para nombres largos que no caben en el polígono
                  const ABBR: Record<string, string[]> = {
                    "buenos-aires": ["Buenos", "Aires"],
                    "buenos-aires-ciudad": ["CABA"],
                    "catamarca": ["Cata-", "marca"],
                    "corrientes": ["Corr."],
                    "entre-rios": ["E. Ríos"],
                    "formosa": ["Formosa"],
                    "la-pampa": ["L. Pampa"],
                    "la-rioja": ["La Rioja"],
                    "mendoza": ["Mendoza"],
                    "misiones": ["Mis."],
                    "neuquen": ["Neuquén"],
                    "rio-negro": ["R. Negro"],
                    "san-juan": ["S. Juan"],
                    "san-luis": ["S. Luis"],
                    "santa-cruz": ["Sta Cruz"],
                    "santa-fe": ["Sta. Fe"],
                    "santiago-del-estero": ["Stgo.", "Estero"],
                    "tierra-del-fuego": ["T. Fuego"],
                    "tucuman": ["Tucumán"],
                    "chaco": ["Chaco"],
                    "chubut": ["Chubut"],
                    "cordoba": ["Córdoba"],
                    "jujuy": ["Jujuy"],
                    "salta": ["Salta"],
                  };
                  const lines = ABBR[province.id] || [province.name];
                  const fontSize = lines[0].length > 7 ? 4 : 5;
                  const lineHeight = fontSize + 1.5;
                  const totalH = lines.length * lineHeight;
                  return (
                    <text
                      x={province.cx}
                      y={province.cy - totalH / 2 + lineHeight / 2}
                      textAnchor="middle"
                      style={{
                        pointerEvents: "none",
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {lines.map((line, li) => (
                        <tspan
                          key={li}
                          x={province.cx}
                          dy={li === 0 ? 0 : lineHeight}
                          style={{
                            fontSize: `${fontSize}px`,
                            fill: isHovered ? "white" : "rgba(255,255,255,0.85)",
                          }}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante */}
        {mounted && hovered && createPortal(
          <div style={{
            position: "fixed",
            left: hovered.x,
            top: hovered.y - 8,
            transform: "translate(-50%, -100%)",
            background: "rgba(10, 14, 26, 0.97)",
            border: `1px solid ${sentimentToStroke(hovered.metric.sentiment)}`,
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            zIndex: 100,
            backdropFilter: "blur(20px)",
            minWidth: "180px",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeInUp 0.15s ease both",
            pointerEvents: "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "0.95rem" }}>{hovered.name}</span>
              {hovered.metric.dominantArchetype && (
                <span style={{ fontSize: "0.75rem" }}>
                  {ARCHETYPE_CONFIG[hovered.metric.dominantArchetype]?.emoji}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>{hovered.capital}</div>

            {/* Sentiment */}
            <div style={{ marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Sentimiento</span>
                <span style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: sentimentToColor(hovered.metric.sentiment),
                }}>
                  {sentimentLabel(hovered.metric.sentiment)}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((hovered.metric.sentiment + 1) / 2) * 100}%`,
                    background: `linear-gradient(90deg, #ef4444, #6b7280, ${sentimentToColor(hovered.metric.sentiment)})`,
                  }}
                />
              </div>
            </div>

            {/* Intensidad */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Intensidad</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {Math.round(hovered.metric.intensity * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${hovered.metric.intensity * 100}%` }}
                />
              </div>
            </div>

            {hovered.metric.dominantArchetype && (
              <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Arquetipo dominante: </span>
                <span style={{ fontSize: "0.78rem", color: ARCHETYPE_CONFIG[hovered.metric.dominantArchetype]?.color, fontWeight: 600 }}>
                  {ARCHETYPE_CONFIG[hovered.metric.dominantArchetype]?.label}
                </span>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Leyenda del mapa */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ width: "100%", height: "6px", background: `linear-gradient(to right, rgba(255,255,255,0.05), ${ARCHETYPE_CONFIG[archetype as any]?.color || "#34d399"})`, borderRadius: "3px", marginBottom: "0.5rem" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Muy desfavorable</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Neutro</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Muy favorable</span>
        </div>
      </div>

      {/* Promedio Nacional */}
      {provinceData && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.75rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--glass-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Aprobación Nacional Promedio</span>
          <span style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "Outfit", color: sentimentToColor(nationalAvg) }}>
            {sentimentLabel(nationalAvg)} ({Math.round(((nationalAvg + 1) / 2) * 100)}%)
          </span>
        </div>
      )}

      {/* Panel de detalle provincial */}
      <ProvinceDetailPanel
        isOpen={!!selectedProvince}
        onClose={() => setSelectedProvince(null)}
        provinceName={selectedProvince?.name || ""}
        provinceId={selectedProvince?.id || ""}
        topic={topic || personalityName || ""}
        nationalSentiment={nationalAvg}
        nationalSummary={nationalSummary || ""}
        category={category}
      />
    </div>
  );
}
