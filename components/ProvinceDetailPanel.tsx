"use client";
import { useEffect, useState } from "react";

interface ProvinceAnalysis {
  summary: string;
  sentiment: number;
  vsNational: number;
  rank: number;
  localFactors: string[];
  emotionalBreakdown: { fear: number; anger: number; hope: number; pride: number; fatigue: number };
  keyIssues: string[];
  historicalContext: string;
  aiPowered?: boolean;
  engine?: string;
}

interface ProvinceDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  provinceName: string;
  provinceId: string;
  topic: string;
  nationalSentiment: number;
  nationalSummary: string;
  category?: string;
}

const EMOTION_LABELS: Record<string, { label: string; color: string }> = {
  fear:    { label: "Miedo",     color: "#ef4444" },
  anger:   { label: "Bronca",    color: "#f97316" },
  hope:    { label: "Esperanza", color: "#34d399" },
  pride:   { label: "Orgullo",   color: "#60a5fa" },
  fatigue: { label: "Fatiga",    color: "#a78bfa" },
};

function sentimentLabel(s: number) {
  if (s > 0.5) return "Muy favorable";
  if (s > 0.2) return "Favorable";
  if (s > -0.2) return "Neutro";
  if (s > -0.5) return "Desfavorable";
  return "Muy desfavorable";
}

function sentimentColor(s: number) {
  if (s > 0.2) return "#34d399";
  if (s > -0.2) return "#fbbf24";
  return "#ef4444";
}

export default function ProvinceDetailPanel({
  isOpen, onClose, provinceName, provinceId, topic, nationalSentiment, nationalSummary, category
}: ProvinceDetailPanelProps) {
  const [data, setData] = useState<ProvinceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  const LOAD_MSGS = [
    `Analizando percepción en ${provinceName}...`,
    "Consultando contexto político regional...",
    "Cruzando datos territoriales...",
    "Generando diagnóstico provincial...",
  ];

  useEffect(() => {
    if (!isOpen || !provinceName) return;
    setData(null);
    setError(null);
    setLoading(true);
    setMsgIndex(0);

    const interval = setInterval(() => setMsgIndex(i => (i + 1) % LOAD_MSGS.length), 1800);

    fetch("/api/province", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic, provinceName, provinceId,
        nationalSentiment, nationalSummary, category
      })
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); clearInterval(interval); })
      .catch(e => { setError(e.message); setLoading(false); clearInterval(interval); });

    return () => clearInterval(interval);
  }, [isOpen, provinceName, topic]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)", zIndex: 1000,
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(520px, 100vw)",
        background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
        borderLeft: "1px solid var(--glass-border)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        zIndex: 1001,
        overflowY: "auto",
        animation: "slideInRight 0.3s ease",
        fontFamily: "Inter, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 1,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
                Análisis Territorial IA
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "Outfit, sans-serif", margin: 0 }}>
                {provinceName}
              </h2>
              <div style={{ fontSize: "0.82rem", color: "var(--accent-primary)", marginTop: "0.25rem" }}>
                Percepción sobre: <strong>"{topic}"</strong>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
              width: "36px", height: "36px",
              cursor: "pointer", fontSize: "1.1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: "50px", height: "50px", margin: "0 auto 1rem",
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "var(--accent-primary)",
                borderRightColor: "var(--accent-secondary)",
                animation: "spin 1s linear infinite",
              }} />
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {LOAD_MSGS[msgIndex]}
              </div>
              <div style={{
                margin: "1rem auto 0",
                width: "200px", height: "3px",
                background: "var(--glass-bg)",
                borderRadius: "2px",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
                  animation: "loadingBar 2.5s ease-in-out infinite",
                }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "1rem", background: "rgba(239,68,68,0.1)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: "0.85rem" }}>
              Error: {error}
            </div>
          )}

          {/* Data */}
          {data && (
            <>
              {/* Sentiment pill + rank */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{
                  flex: 1, minWidth: "140px",
                  padding: "1rem",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>Sentimiento local</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: sentimentColor(data.sentiment), fontFamily: "Outfit, sans-serif" }}>
                    {sentimentLabel(data.sentiment)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {Math.round(((data.sentiment + 1) / 2) * 100)}%
                  </div>
                </div>

                <div style={{
                  flex: 1, minWidth: "140px",
                  padding: "1rem",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>vs. Promedio Nacional</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: (data.vsNational || 0) >= 0 ? "#34d399" : "#ef4444", fontFamily: "Outfit, sans-serif" }}>
                    {(data.vsNational || 0) > 0 ? "+" : ""}{Math.round(data.vsNational || 0)} pts
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Ranking #{data.rank || "?"}/24
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                padding: "1rem",
                background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "var(--radius-md)",
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", fontWeight: 600 }}>
                  Análisis IA {data.engine === "groq" ? "(Llama 3.3)" : "(Gemini)"}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                  {data.summary}
                </p>
              </div>

              {/* Factores locales */}
              {data.localFactors?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem", fontWeight: 600 }}>
                    Factores Locales Clave
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {data.localFactors.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", gap: "0.6rem", alignItems: "flex-start",
                        padding: "0.5rem 0.75rem",
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}>
                        <span style={{ color: "var(--accent-primary)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Espectro emocional */}
              {data.emotionalBreakdown && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem", fontWeight: 600 }}>
                    Espectro Emocional Provincial
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {Object.entries(data.emotionalBreakdown).map(([key, value]) => {
                      const em = EMOTION_LABELS[key];
                      if (!em) return null;
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", width: "72px", flexShrink: 0 }}>{em.label}</span>
                          <div style={{ flex: 1, height: "6px", background: "var(--glass-bg)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                            <div style={{ height: "100%", width: `${value}%`, background: em.color, borderRadius: "3px", transition: "width 0.8s ease" }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", color: em.color, fontWeight: 600, width: "30px", textAlign: "right" }}>{value}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contexto histórico */}
              {data.historicalContext && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}>
                  <span style={{ color: "#fbbf24", fontWeight: 600 }}>Contexto: </span>
                  {data.historicalContext}
                </div>
              )}

              {/* Temas clave */}
              {data.keyIssues?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {data.keyIssues.map((issue, i) => (
                    <span key={i} style={{
                      padding: "0.25rem 0.65rem",
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      color: "var(--accent-primary)",
                    }}>
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0 }
          50% { width: 60%; margin-left: 20% }
          100% { width: 0%; margin-left: 100% }
        }
      `}</style>
    </>
  );
}
