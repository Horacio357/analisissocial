import { Lightbulb, Target } from "lucide-react";

interface ComparativeStrategyProps {
  verdict: string;
  recommendations: string[];
}

export default function ComparativeStrategy({ verdict, recommendations }: ComparativeStrategyProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      marginTop: "2rem",
      paddingTop: "2rem",
      borderTop: "1px solid var(--glass-border)"
    }}>
      <h3 style={{ 
        fontFamily: "Outfit", 
        fontSize: "1.2rem", 
        fontWeight: 800, 
        color: "var(--text-primary)", 
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        textAlign: "center"
      }}>
        <Target size={20} color="#f59e0b" />
        Estrategia Competitiva (IA)
      </h3>

      <div style={{
        background: "rgba(245, 158, 11, 0.05)",
        border: "1px dashed rgba(245, 158, 11, 0.3)",
        borderRadius: "var(--radius-md)",
        padding: "1.2rem",
        textAlign: "center",
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6
      }}>
        <strong style={{ color: "#f59e0b" }}>Veredicto: </strong>
        {verdict}
      </div>

      <div style={{
        background: "linear-gradient(145deg, rgba(124, 58, 237, 0.05), rgba(0, 212, 255, 0.05))",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        animation: "fadeInUp 0.5s ease both"
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
          Directivas Tácticas vs Adversario
        </h4>
        <ul style={{ margin: 0, paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {recommendations.map((rec, i) => (
            <li key={i} style={{
              fontSize: "0.9rem",
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
    </div>
  );
}
