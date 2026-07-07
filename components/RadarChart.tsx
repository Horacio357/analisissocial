"use client";

import { useMemo, useState } from "react";
import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PersonalityAnalysis } from "@/lib/types";
import { ARCHETYPE_CONFIG, metricsToRadarData } from "@/lib/utils";
import { Info } from "lucide-react";

// ─── Descripciones didácticas de cada métrica ────────────────────────────────
export const METRIC_DESCRIPTIONS: Record<string, { icon: string; short: string; detail: string }> = {
  "Aprobación": {
    icon: "👍",
    short: "Porcentaje de la narrativa positiva sobre la figura.",
    detail: "Refleja qué tan bien evaluada es la figura en el discurso mediático y público. Un valor alto (>70) indica imagen predominantemente positiva. Un valor bajo (<30) señala rechazo generalizado.",
  },
  "Polarización": {
    icon: "⚡",
    short: "Grado de división de opiniones que genera.",
    detail: "Mide la intensidad del debate que provoca. Alta polarización (>70) significa que la figura divide fuertemente a la sociedad: tiene tanto admiradores fervorosos como detractores intensos. No es negativo per se — es poder de agenda.",
  },
  "Movilización": {
    icon: "📢",
    short: "Capacidad de generar acción y presencia mediática.",
    detail: "Indica cuánto mueve la figura a la gente: a las urnas, a las calles, o a los feeds. Alta movilización (>70) significa que sus declaraciones o acciones generan reacción inmediata y masiva.",
  },
  "Coherencia": {
    icon: "🧭",
    short: "Consistencia del discurso y las acciones a lo largo del tiempo.",
    detail: "Evalúa si la narrativa de la figura es consistente o contradictoria. Alta coherencia (>70) significa que el público percibe alineación entre lo que dice y hace. La baja coherencia erosiona la confianza.",
  },
  "Resonancia": {
    icon: "🔊",
    short: "Impacto y alcance real en la conversación pública.",
    detail: "Mide cuán profundo cala el mensaje en la sociedad, más allá del volumen de menciones. Alta resonancia indica que la figura no solo es mencionada, sino que sus ideas son debatidas y adoptadas.",
  },
  "Confianza": {
    icon: "🤝",
    short: "Nivel de credibilidad percibida por la ciudadanía.",
    detail: "Representa la fe que el público deposita en la figura como referente. Alta confianza (>70) es el activo más valioso: es difícil de construir y muy fácil de destruir. Correlaciona con coherencia y aprobación.",
  },
};

interface RadarChartProps {
  analysis: PersonalityAnalysis;
  size?: number;
  compareAnalysis?: PersonalityAnalysis | null; // Para modo comparación
  showLegend?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { subject: string; value: number } }>;
}) => {
  if (active && payload && payload.length) {
    const { subject, value } = payload[0].payload;
    const desc = METRIC_DESCRIPTIONS[subject];
    return (
      <div
        style={{
          background: "rgba(10, 14, 26, 0.97)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem 1rem",
          backdropFilter: "blur(16px)",
          maxWidth: "220px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "1rem" }}>{desc?.icon}</span>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>{subject}</p>
        </div>
        <p
          style={{
            color: "var(--accent-primary)",
            fontSize: "1.4rem",
            fontWeight: 800,
            fontFamily: "Outfit",
            marginBottom: "0.4rem",
          }}
        >
          {value}
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/100</span>
        </p>
        {desc && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", lineHeight: 1.5 }}>{desc.short}</p>
        )}
      </div>
    );
  }
  return null;
};

// Tarjeta explicativa de métrica con tooltip expandible
function MetricCard({
  subject,
  value,
  color,
  compareValue,
}: {
  subject: string;
  value: number;
  color: string;
  compareValue?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const desc = METRIC_DESCRIPTIONS[subject];
  const valueColor = value >= 70 ? "#34d399" : value >= 40 ? "var(--text-secondary)" : "#f97316";

  return (
    <div
      style={{
        padding: "0.5rem 0.65rem",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "var(--radius-sm)",
        border: `1px solid rgba(255,255,255,${expanded ? "0.08" : "0.04"})`,
        transition: "all 0.2s ease",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Fila principal */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.8rem" }}>{desc?.icon}</span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{subject}</span>
          <Info size={10} color="var(--text-muted)" style={{ opacity: 0.6 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {compareValue !== undefined && (
            <span
              style={{
                fontSize: "0.72rem",
                color: compareValue > value ? "#ef4444" : "#34d399",
                opacity: 0.7,
              }}
            >
              {compareValue}
            </span>
          )}
          <span style={{ fontSize: "0.9rem", fontWeight: 700, fontFamily: "Outfit", color: valueColor }}>
            {value}
          </span>
        </div>
      </div>
      {/* Barra de progreso */}
      <div style={{ marginTop: "0.3rem" }}>
        <div className="progress-bar" style={{ height: "3px" }}>
          <div
            className="progress-fill"
            style={{
              width: `${value}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
            }}
          />
        </div>
        {compareValue !== undefined && (
          <div className="progress-bar" style={{ height: "2px", marginTop: "2px", opacity: 0.4 }}>
            <div
              className="progress-fill"
              style={{ width: `${compareValue}%`, background: "rgba(255,255,255,0.4)" }}
            />
          </div>
        )}
      </div>
      {/* Descripción expandida */}
      {expanded && desc && (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "0.4rem",
            animation: "fadeIn 0.2s ease both",
          }}
        >
          {desc.detail}
        </p>
      )}
    </div>
  );
}

export default function RadarChart({
  analysis,
  size = 300,
  compareAnalysis,
  showLegend = true,
}: RadarChartProps) {
  const archetypeConf = ARCHETYPE_CONFIG[analysis.archetype];
  const compareConf = compareAnalysis ? ARCHETYPE_CONFIG[compareAnalysis.archetype] : null;
  const data = useMemo(() => metricsToRadarData(analysis.metrics), [analysis.metrics]);
  const compareData = useMemo(
    () => (compareAnalysis ? metricsToRadarData(compareAnalysis.metrics) : null),
    [compareAnalysis]
  );

  // Combinar datos para el radar doble
  const mergedData = useMemo(() => {
    if (!compareData) return data;
    return data.map((d, i) => ({
      ...d,
      compare: compareData[i].value,
    }));
  }, [data, compareData]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Perfil Multidimensional
          {compareAnalysis && ` · Comparación`}
        </span>
      </div>

      {/* Leyenda del comparador */}
      {compareAnalysis && compareConf && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "12px", height: "3px", borderRadius: "2px", background: archetypeConf.color }} />
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{analysis.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "12px", height: "3px", borderRadius: "2px", background: compareConf.color, opacity: 0.7 }} />
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{compareAnalysis.name}</span>
          </div>
        </div>
      )}

      {/* Radar */}
      <div style={{ width: "100%", height: size, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${archetypeConf.color}20, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar data={mergedData} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="rgba(0,212,255,0.1)" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "Inter" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 9 }}
              tickCount={4}
              stroke="rgba(0,212,255,0.05)"
            />
            {/* Figura principal */}
            <Radar
              name={analysis.name}
              dataKey="value"
              stroke={archetypeConf.color}
              strokeWidth={2}
              fill={archetypeConf.color}
              fillOpacity={0.18}
              dot={{ fill: archetypeConf.color, r: 4, strokeWidth: 0 }}
            />
            {/* Figura comparada (opcional) */}
            {compareAnalysis && compareConf && (
              <Radar
                name={compareAnalysis.name}
                dataKey="compare"
                stroke={compareConf.color}
                strokeWidth={2}
                fill={compareConf.color}
                fillOpacity={0.1}
                dot={{ fill: compareConf.color, r: 3, strokeWidth: 0 }}
                strokeDasharray="5 3"
              />
            )}
            <Tooltip content={<CustomTooltip />} />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>

      {/* Leyenda interactiva de métricas */}
      {showLegend && (
        <div
          className="responsive-grid-2"
          style={{
            gap: "0.4rem",
            width: "100%",
            marginTop: "0.5rem",
          }}
        >
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              marginBottom: "0.1rem",
            }}
          >
            <Info size={11} color="var(--accent-primary)" />
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
              Tocá cada métrica para ver su descripción
            </span>
          </div>
          {data.map((item, i) => (
            <MetricCard
              key={item.subject}
              subject={item.subject}
              value={item.value}
              color={archetypeConf.color}
              compareValue={compareData?.[i]?.value}
            />
          ))}
        </div>
      )}
    </div>
  );
}
