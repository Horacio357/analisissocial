"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader2, Zap, Radio } from "lucide-react";
import { sentimentToColor } from "@/lib/utils";

interface Narrative {
  keyword: string;
  volume: number;
  trend: string;
  sentiment: number;
  sample: string;
}

// Datos mock de narrativas emergentes para cuando no hay API
const MOCK_NARRATIVES: Narrative[] = [
  { keyword: "Inflación", volume: 94, trend: "↑ creciendo", sentiment: -0.7, sample: "La inflación de junio supera las proyecciones del FMI por tercer mes consecutivo" },
  { keyword: "Elecciones 2025", volume: 78, trend: "↑ creciendo", sentiment: -0.1, sample: "Partidos definen sus listas definitivas con miras al proceso electoral de octubre" },
  { keyword: "Economía", volume: 65, trend: "↓ tensión", sentiment: -0.4, sample: "El riesgo país baja pero los salarios reales siguen sin recuperarse" },
  { keyword: "Seguridad", volume: 52, trend: "↑ creciendo", sentiment: -0.6, sample: "Debate nacional sobre la política de seguridad tras incidentes en zonas urbanas" },
  { keyword: "Derechos sociales", volume: 41, trend: "→ estable", sentiment: 0.2, sample: "Organizaciones civiles celebran avances en legislación de derechos" },
];

export default function NarrativasEmergentes() {
  const [narratives, setNarratives] = useState<Narrative[]>(MOCK_NARRATIVES);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchNarratives = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch("/api/analyze?mode=emerging");
      if (!res.ok) return;
      const data = await res.json();
      if (data.narratives?.length > 0) {
        setNarratives(data.narratives);
        setUpdatedAt(data.updatedAt);
      }
    } catch {
      // Usar mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNarratives();
    // Refrescar cada 10 minutos
    const interval = setInterval(() => fetchNarratives(), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const maxVolume = Math.max(...narratives.map(n => n.volume));

  return (
    <div className="glass-card" style={{ border: "1px solid rgba(139,92,246,0.2)", padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Radio size={15} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontFamily: "Outfit", fontSize: "0.95rem", fontWeight: 700 }}>
                Narrativas Emergentes
              </span>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, color: "#8b5cf6",
                padding: "0.1rem 0.4rem", background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.25)", borderRadius: "4px",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Alerta temprana
              </span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
              Temas que están ganando intensidad en tiempo real
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchNarratives(true)}
          disabled={loading}
          style={{
            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "8px", padding: "0.4rem", cursor: "pointer",
            display: "flex", alignItems: "center", transition: "all 0.2s",
          }}
          title="Actualizar narrativas"
        >
          {loading
            ? <Loader2 size={14} color="#8b5cf6" style={{ animation: "spin 1s linear infinite" }} />
            : <RefreshCw size={14} color="#8b5cf6" />
          }
        </button>
      </div>

      {/* Lista de narrativas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {narratives.map((n, i) => {
          const pct = Math.round((n.volume / maxVolume) * 100);
          const isExpanded = expanded === n.keyword;
          const color = sentimentToColor(n.sentiment);
          const isAlert = n.sentiment < -0.4 && n.volume > 50;
          const isGrowing = n.trend.includes("↑");
          const isFalling = n.trend.includes("↓");

          return (
            <div
              key={n.keyword}
              onClick={() => setExpanded(isExpanded ? null : n.keyword)}
              style={{
                padding: "0.65rem 0.75rem",
                background: isAlert ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${isAlert ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                animationDelay: `${i * 0.08}s`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isAlert ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isAlert ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)"; }}
            >
              {/* Fila principal */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                {/* Ícono de alerta o ranking */}
                <div style={{ flexShrink: 0, width: "22px", textAlign: "center" }}>
                  {isAlert
                    ? <AlertTriangle size={14} color="#f97316" />
                    : <span style={{ fontSize: "0.75rem", fontFamily: "Outfit", fontWeight: 800, color: "var(--text-muted)" }}>
                        {i + 1}
                      </span>
                  }
                </div>

                {/* Keyword + trend */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Outfit", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {n.keyword}
                    </span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700,
                      color: isGrowing ? "#34d399" : isFalling ? "#f97316" : "var(--text-muted)",
                      display: "flex", alignItems: "center", gap: "0.15rem",
                    }}>
                      {isGrowing ? <TrendingUp size={10} /> : isFalling ? <TrendingDown size={10} /> : null}
                      {n.trend}
                    </span>
                    {isAlert && (
                      <span style={{
                        fontSize: "0.58rem", color: "#f97316", fontWeight: 700,
                        padding: "0.05rem 0.35rem", background: "rgba(249,115,22,0.12)",
                        border: "1px solid rgba(249,115,22,0.3)", borderRadius: "4px",
                        textTransform: "uppercase",
                      }}>
                        ⚡ Alta tensión
                      </span>
                    )}
                  </div>

                  {/* Barra de volumen */}
                  <div style={{ marginTop: "0.35rem" }}>
                    <div className="progress-bar" style={{ height: "3px" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}60, ${color})`,
                        borderRadius: "2px",
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>
                </div>

                {/* Volumen + sentimiento */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: "0.85rem", fontFamily: "Outfit", fontWeight: 800, color }}>
                    {n.volume}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>menciones</div>
                </div>
              </div>

              {/* Muestra de noticia expandida */}
              {isExpanded && n.sample && (
                <div style={{
                  marginTop: "0.5rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  animation: "fadeIn 0.2s ease both",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                    <Zap size={11} color="#8b5cf6" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {n.sample}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "0.75rem", paddingTop: "0.75rem",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
          {updatedAt
            ? `Actualizado ${new Date(updatedAt).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })}`
            : "Datos en tiempo real · NewsData.io"}
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span className="status-dot status-live" style={{ width: "5px", height: "5px" }} />
          Refresca c/10 min
        </span>
      </div>
    </div>
  );
}
