import { PersonalityAnalysis } from "@/lib/types";
import { Lightbulb, Database, Fingerprint, RefreshCcw, TrendingUp } from "lucide-react";

interface IntelligenceHubProps {
  analysis: PersonalityAnalysis;
}

export default function IntelligenceHub({ analysis }: IntelligenceHubProps) {
  // Verificamos si hay recomendaciones disponibles
  const hasRecommendations = analysis.strategicRecommendations && analysis.strategicRecommendations.length > 0;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      marginTop: "1.5rem"
    }}>
      {/* ─── TEMAS DE CONVERSACIÓN (Keywords) ─── */}
      {analysis.keywords && analysis.keywords.length > 0 && (
        <div style={{ animation: "fadeIn 0.5s ease 0.2s both" }}>
          <h4 style={{ 
            fontFamily: "Outfit", 
            fontSize: "0.85rem", 
            fontWeight: 700, 
            color: "var(--text-secondary)", 
            marginBottom: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <TrendingUp size={14} color="var(--accent-primary)" />
            Temáticas en Tendencia
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {analysis.keywords.map((kw, i) => (
              <span key={i} style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.8rem",
                borderRadius: "100px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                fontWeight: 500,
                textTransform: "capitalize"
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── RECOMENDACIONES ESTRATÉGICAS (IA) ─── */}
      {hasRecommendations && (
        <div style={{
          background: "linear-gradient(145deg, rgba(124, 58, 237, 0.05), rgba(0, 212, 255, 0.05))",
          border: "1px solid rgba(124, 58, 237, 0.2)",
          borderRadius: "var(--radius-md)",
          padding: "1.2rem",
          animation: "fadeInUp 0.5s ease 0.3s both"
        }}>
          <h4 style={{ 
            fontFamily: "Outfit", 
            fontSize: "1rem", 
            fontWeight: 700, 
            color: "var(--text-primary)", 
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <Lightbulb size={16} color="#c084fc" />
            Directivas para Comunicación & PR
          </h4>
          <ul style={{ margin: 0, paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {analysis.strategicRecommendations!.map((rec, i) => (
              <li key={i} style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                gap: "0.6rem",
                alignItems: "flex-start"
              }}>
                <span style={{ 
                  color: "#c084fc", 
                  fontWeight: 900, 
                  marginTop: "-0.1rem" 
                }}>•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── TRANSPARENCIA DE DATOS ─── */}
      <div style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px dashed var(--glass-border)",
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        animation: "fadeIn 0.5s ease 0.4s both"
      }}>
        <h4 style={{ 
          fontFamily: "Outfit", 
          fontSize: "0.8rem", 
          fontWeight: 700, 
          color: "var(--text-muted)", 
          marginBottom: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Ficha Técnica de Análisis
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <Database size={12} color="var(--text-muted)" />
            <span><b>Fuentes:</b> NewsData.io (Últimos artículos de prensa local)</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <Fingerprint size={12} color="var(--text-muted)" />
            <span><b>Motor Semántico:</b> Google Gemini 1.5 Pro</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <RefreshCcw size={12} color="var(--text-muted)" />
            <span><b>Última captura:</b> Hace unos instantes</span>
          </div>

        </div>
      </div>

    </div>
  );
}
