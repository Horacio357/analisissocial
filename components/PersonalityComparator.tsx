"use client";

import { useState, useCallback } from "react";
import {
  GitCompare,
  Search,
  Loader2,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { PersonalityAnalysis } from "@/lib/types";
import { ARCHETYPE_CONFIG, sentimentToColor, sentimentToLabel } from "@/lib/utils";
import RadarChart from "./RadarChart";
import HeatMapArgentina from "./HeatMapArgentina";
import ProTools from "./ProTools";
import ComparativeStrategy from "./ComparativeStrategy";

// ─── Mini buscador interno ────────────────────────────────────────────────────
const QUICK_NAMES = [
  "Javier Milei", "Lionel Messi", "Cristina Kirchner", "Mauricio Macri",
  "Patricia Bullrich", "Axel Kicillof", "Victoria Villarruel", "Sergio Massa",
  "Alberto Fernández", "Roberto Lavagna", "Susana Giménez", "Marcelo Tinelli",
];

function MiniSearch({
  slot,
  current,
  onSelect,
  exclude,
}: {
  slot: "A" | "B";
  current: PersonalityAnalysis | null;
  onSelect: (a: PersonalityAnalysis) => void;
  exclude?: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const color = slot === "A" ? "var(--accent-primary)" : "#a78bfa";

  const handleInput = (v: string) => {
    setQuery(v);
    if (v.length > 1) {
      const f = QUICK_NAMES.filter(
        (n) => n.toLowerCase().includes(v.toLowerCase()) && n !== exclude
      );
      setSuggestions(f.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const analyze = useCallback(
    async (name: string) => {
      if (!name.trim()) return;
      setLoading(true);
      setError(null);
      setSuggestions([]);
      setQuery(name);
      try {
        const res = await fetch(`/api/analyze?name=${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error("Error al analizar");
        const data: PersonalityAnalysis = await res.json();
        onSelect(data);
        setQuery(data.name);
      } catch {
        setError("No se pudo obtener el análisis. Intentá con otro nombre.");
      } finally {
        setLoading(false);
      }
    },
    [onSelect]
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Slot header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.6rem",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: `${color}20`,
            border: `1px solid ${color}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Outfit",
            fontWeight: 800,
            fontSize: "0.75rem",
            color,
          }}
        >
          {slot}
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          {current ? current.name : `Elegí figura ${slot}`}
        </span>
        {current && (
          <span
            className={`badge badge-${current.archetype}`}
            style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}
          >
            {ARCHETYPE_CONFIG[current.archetype].emoji}{" "}
            {ARCHETYPE_CONFIG[current.archetype].label}
          </span>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "rgba(13,21,40,0.9)",
          border: `1px solid ${color}25`,
          borderRadius: "var(--radius-md)",
          padding: "0.6rem 0.875rem",
          transition: "border-color 0.2s",
        }}
        onFocus={() => {}}
      >
        {loading ? (
          <Loader2 size={15} color={color} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
        ) : (
          <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze(query)}
          placeholder={`Buscar personalidad ${slot}...`}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontFamily: "Inter",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setSuggestions([]); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
          >
            <X size={13} />
          </button>
        )}
        <button
          onClick={() => analyze(query)}
          disabled={!query.trim() || loading}
          style={{
            padding: "0.3rem 0.65rem",
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: "6px",
            color,
            fontSize: "0.72rem",
            fontFamily: "Outfit",
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            opacity: query.trim() ? 1 : 0.4,
          }}
        >
          Analizar
        </button>
      </div>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "rgba(10,14,26,0.98)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            zIndex: 50,
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeInUp 0.15s ease both",
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => analyze(s)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.6rem 0.875rem",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontFamily: "Inter",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--glass-hover)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {s}
              <ChevronRight size={13} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.3rem" }}>⚠️ {error}</p>
      )}

      {/* Accesos rápidos */}
      {!current && (
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          {QUICK_NAMES.filter((n) => n !== exclude).slice(0, 4).map((name) => (
            <button
              key={name}
              onClick={() => analyze(name)}
              style={{
                padding: "0.2rem 0.6rem",
                background: `${color}08`,
                border: `1px solid ${color}25`,
                borderRadius: "100px",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.7rem",
                fontFamily: "Inter",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = color;
                (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.borderColor = `${color}25`;
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fila de comparación de una sola métrica ─────────────────────────────────
function MetricRow({
  label,
  valueA,
  valueB,
  colorA,
  colorB,
  higher = "better",
}: {
  label: string;
  valueA: number;
  valueB: number;
  colorA: string;
  colorB: string;
  higher?: "better" | "worse" | "neutral";
}) {
  const diff = valueA - valueB;
  const winner =
    Math.abs(diff) < 5 ? "tie" : diff > 0 ? "A" : "B";
  const diffColor =
    winner === "tie" ? "var(--text-muted)" :
    (winner === "A" && higher === "better") || (winner === "B" && higher === "worse")
      ? "#34d399"
      : "#f97316";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: "0.5rem",
        alignItems: "center",
        padding: "0.4rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Barra A */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
          <span
            style={{ fontSize: "0.85rem", fontFamily: "Outfit", fontWeight: 700, color: colorA }}
          >
            {valueA}
          </span>
        </div>
        <div className="progress-bar" style={{ height: "4px" }}>
          <div
            className="progress-fill"
            style={{ width: `${valueA}%`, background: colorA, marginLeft: "auto", direction: "rtl" as const }}
          />
        </div>
      </div>

      {/* Label central */}
      <div style={{ textAlign: "center", minWidth: "90px" }}>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
          {label}
        </div>
        {winner !== "tie" ? (
          <div style={{ fontSize: "0.65rem", color: diffColor, fontWeight: 700 }}>
            {winner === "A" ? "◀" : "▶"} +{Math.abs(diff)}
          </div>
        ) : (
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>empate</div>
        )}
      </div>

      {/* Barra B */}
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.2rem" }}>
          <span
            style={{ fontSize: "0.85rem", fontFamily: "Outfit", fontWeight: 700, color: colorB }}
          >
            {valueB}
          </span>
        </div>
        <div className="progress-bar" style={{ height: "4px" }}>
          <div className="progress-fill" style={{ width: `${valueB}%`, background: colorB }} />
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PersonalityComparator() {
  const [personA, setPersonA] = useState<PersonalityAnalysis | null>(null);
  const [personB, setPersonB] = useState<PersonalityAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<"radar" | "metrics" | "map">("radar");
  
  const [comparativeData, setComparativeData] = useState<{verdict: string; strategicRecommendations: string[]} | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  const colorA = "var(--accent-primary)"; // cyan
  const colorB = "#a78bfa"; // violeta

  const confA = personA ? ARCHETYPE_CONFIG[personA.archetype] : null;
  const confB = personB ? ARCHETYPE_CONFIG[personB.archetype] : null;

  const bothLoaded = personA && personB;

  const TABS = [
    { id: "radar", label: "Radar" },
    { id: "metrics", label: "Cara a Cara" },
    { id: "map", label: "Territorio" },
  ];

  const generateStrategy = async () => {
    if (!personA || !personB) return;
    setLoadingStrategy(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateA: personA, candidateB: personB })
      });
      if (res.ok) {
        const data = await res.json();
        setComparativeData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStrategy(false);
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(167,139,250,0.15))",
            border: "1px solid rgba(0,212,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GitCompare size={18} color="var(--accent-primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontFamily: "Outfit", fontSize: "1.2rem", fontWeight: 800 }}>
                Comparador de Personalidades
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Compará arquetipos, métricas y percepción territorial
              </p>
            </div>
            {(personA || personB) && (
              <button
                onClick={() => { setPersonA(null); setPersonB(null); }}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
              >
                Nueva Comparación
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Buscadores A y B */}
      <div className="responsive-comparator"
        style={{
          alignItems: "start",
          marginBottom: "1.5rem",
        }}
      >
        <MiniSearch
          slot="A"
          current={personA}
          onSelect={setPersonA}
          exclude={personB?.name}
        />
        <div style={{ paddingTop: "2rem", display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowRight size={14} color="var(--text-muted)" />
          </div>
        </div>
        <MiniSearch
          slot="B"
          current={personB}
          onSelect={setPersonB}
          exclude={personA?.name}
        />
      </div>

      {/* ─── Resultados de la comparación ─────────────────────────────── */}
      {bothLoaded ? (
        <div id="pdf-comparator-container" style={{ animation: "fadeInUp 0.4s ease both" }}>
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <ProTools targetId="pdf-comparator-container" reportName={`Comparativa_${personA!.name}_vs_${personB!.name}`} />
          </div>

          {/* Encabezado de la comparación */}
          <div className="responsive-comparator"
            style={{
              alignItems: "center",
              padding: "1rem",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "1.25rem",
            }}
          >
            {/* Persona A */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  marginBottom: "0.25rem",
                  filter: `drop-shadow(0 0 8px ${confA!.color})`,
                }}
              >
                {confA!.emoji}
              </div>
              <div
                style={{
                  fontFamily: "Outfit",
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: colorA,
                  marginBottom: "0.2rem",
                }}
              >
                {personA!.name}
              </div>
              <span className={`badge badge-${personA!.archetype}`} style={{ fontSize: "0.65rem" }}>
                {confA!.label}
              </span>
              <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: sentimentToColor(personA!.sentimentOverall), fontWeight: 600 }}>
                {sentimentToLabel(personA!.sentimentOverall)}
              </div>
            </div>

            {/* VS */}
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontFamily: "Outfit",
                  fontSize: "1.2rem",
                  fontWeight: 900,
                  background: "linear-gradient(135deg, var(--accent-primary), #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                VS
              </span>
            </div>

            {/* Persona B */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  marginBottom: "0.25rem",
                  filter: `drop-shadow(0 0 8px ${confB!.color})`,
                }}
              >
                {confB!.emoji}
              </div>
              <div
                style={{
                  fontFamily: "Outfit",
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: colorB,
                  marginBottom: "0.2rem",
                }}
              >
                {personB!.name}
              </div>
              <span className={`badge badge-${personB!.archetype}`} style={{ fontSize: "0.65rem" }}>
                {confB!.label}
              </span>
              <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: sentimentToColor(personB!.sentimentOverall), fontWeight: 600 }}>
                {sentimentToLabel(personB!.sentimentOverall)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "var(--radius-md)",
              padding: "0.25rem",
              marginBottom: "1.25rem",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  background: activeTab === tab.id ? "rgba(0,212,255,0.1)" : "transparent",
                  border: `1px solid ${activeTab === tab.id ? "rgba(0,212,255,0.25)" : "transparent"}`,
                  borderRadius: "var(--radius-sm)",
                  color: activeTab === tab.id ? "var(--accent-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontFamily: "Outfit",
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Radar doble */}
          {activeTab === "radar" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <RadarChart
                analysis={personA!}
                compareAnalysis={personB}
                size={280}
                showLegend={true}
              />
            </div>
          )}

          {/* Tab: Métricas */}
          {activeTab === "metrics" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              {/* Encabezados de columnas */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colorA,
                    textAlign: "left",
                  }}
                >
                  {personA!.name}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", minWidth: "90px" }}>
                  Métrica
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: colorB,
                    textAlign: "right",
                  }}
                >
                  {personB!.name}
                </span>
              </div>

              {[
                { key: "approval", label: "Aprobación", higher: "better" },
                { key: "polarization", label: "Polarización", higher: "neutral" },
                { key: "mobilization", label: "Movilización", higher: "better" },
                { key: "coherence", label: "Coherencia", higher: "better" },
                { key: "resonance", label: "Resonancia", higher: "better" },
                { key: "trust", label: "Confianza", higher: "better" },
              ].map((m) => (
                <MetricRow
                  key={m.key}
                  label={m.label}
                  valueA={personA!.metrics[m.key as keyof typeof personA.metrics]}
                  valueB={personB!.metrics[m.key as keyof typeof personB.metrics]}
                  colorA={confA!.color}
                  colorB={confB!.color}
                  higher={m.higher as "better" | "worse" | "neutral"}
                />
              ))}
            </div>
          )}

          {/* Tab: Mapa comparativo */}
          {activeTab === "map" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colorA,
                      textAlign: "center",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {personA!.name}
                  </div>
                  <HeatMapArgentina
                    provinceData={personA!.provinceData}
                    personalityName={personA!.name}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colorB,
                      textAlign: "center",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {personB!.name}
                  </div>
                  <HeatMapArgentina
                    provinceData={personB!.provinceData}
                    personalityName={personB!.name}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Estrategia Comparativa */}
          {!comparativeData ? (
            <button
              onClick={generateStrategy}
              disabled={loadingStrategy}
              style={{
                width: "100%",
                padding: "1rem",
                marginTop: "1rem",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                color: "#f59e0b",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: loadingStrategy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { if(!loadingStrategy) e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))" }}
              onMouseLeave={(e) => { if(!loadingStrategy) e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))" }}
            >
              {loadingStrategy ? <Loader2 size={18} className="spin" /> : <GitCompare size={18} />}
              {loadingStrategy ? "Analizando variables de combate..." : "Generar Estrategia Competitiva (IA)"}
            </button>
          ) : (
            <ComparativeStrategy verdict={comparativeData.verdict} recommendations={comparativeData.strategicRecommendations} />
          )}

        </div>
      ) : (
        /* Estado vacío */
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 1rem",
            border: "1px dashed rgba(0,212,255,0.15)",
            borderRadius: "var(--radius-lg)",
            animation: "fadeIn 0.3s ease both",
          }}
        >
          <GitCompare size={32} color="rgba(0,212,255,0.3)" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 500 }}>
            Buscá dos personalidades para comparar
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
            Radar doble · Métricas cara a cara · Mapa comparativo
          </p>
        </div>
      )}
    </div>
  );
}
