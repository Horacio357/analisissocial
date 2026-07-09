"use client";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Consultando fuentes de inteligencia...",
  "Analizando ecosistema mediático...",
  "Procesando señales de la opinión pública...",
  "Cruzando datos regionales...",
  "Calculando métricas de percepción...",
  "Consultando base de datos histórica...",
  "Generando perfil psicológico profundo...",
  "Sintetizando inteligencia estratégica...",
];

interface LoadingAnalysisProps {
  name?: string;
  isTopic?: boolean;
}

export default function LoadingAnalysis({ name, isTopic }: LoadingAnalysisProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 1800);
    const dotTimer = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 400);
    return () => { clearInterval(msgTimer); clearInterval(dotTimer); };
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 2rem",
      gap: "1.5rem",
      minHeight: "300px",
    }}>
      {/* Orbs animados */}
      <div style={{ position: "relative", width: "80px", height: "80px" }}>
        {/* Orb central */}
        <div style={{
          position: "absolute",
          inset: "15px",
          borderRadius: "50%",
          background: "var(--accent-primary)",
          boxShadow: "0 0 30px var(--accent-primary)",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        {/* Anillo giratorio 1 */}
        <div style={{
          position: "absolute",
          inset: "0",
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "var(--accent-primary)",
          borderRightColor: "rgba(99,102,241,0.3)",
          animation: "spin 1.2s linear infinite",
        }} />
        {/* Anillo giratorio 2 */}
        <div style={{
          position: "absolute",
          inset: "8px",
          borderRadius: "50%",
          border: "2px solid transparent",
          borderBottomColor: "var(--accent-secondary)",
          borderLeftColor: "rgba(139,92,246,0.3)",
          animation: "spin 1.8s linear infinite reverse",
        }} />
      </div>

      {/* Texto principal */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "Outfit, sans-serif",
          marginBottom: "0.25rem",
        }}>
          Analizando {isTopic ? "percepción nacional de" : ""} <span style={{ color: "var(--accent-primary)" }}>"{name}"</span>
        </div>
        <div style={{
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          fontFamily: "Inter, sans-serif",
          minHeight: "1.4rem",
          transition: "opacity 0.3s",
        }}>
          {MESSAGES[msgIndex]}{".".repeat(dots)}
        </div>
      </div>

      {/* Barra de progreso animada */}
      <div style={{
        width: "280px",
        height: "4px",
        background: "var(--glass-bg)",
        borderRadius: "2px",
        overflow: "hidden",
        border: "1px solid var(--glass-border)",
      }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
          animation: "loadingBar 2.5s ease-in-out infinite",
          borderRadius: "2px",
        }} />
      </div>

      {/* Motores activos */}
      <div style={{
        display: "flex",
        gap: "1rem",
        fontSize: "0.72rem",
        color: "var(--text-muted)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          Gemini
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "pulse 2s infinite 0.5s" }} />
          Llama 3.3
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fb923c", display: "inline-block", animation: "pulse 2.5s infinite 1s" }} />
          NewsData + RSS
        </span>
      </div>

      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
