"use client";
import { useState } from "react";

const PRESET_TOPICS = [
  { key: "seguridad", emoji: "🔒", label: "Seguridad" },
  { key: "economía", emoji: "💰", label: "Economía" },
  { key: "salud", emoji: "🏥", label: "Salud" },
  { key: "educación", emoji: "📚", label: "Educación" },
  { key: "nutrición", emoji: "🥗", label: "Nutrición" },
  { key: "empleo", emoji: "💼", label: "Empleo" },
  { key: "vivienda", emoji: "🏘️", label: "Vivienda" },
  { key: "energía", emoji: "⚡", label: "Energía" },
  { key: "corrupción", emoji: "⚖️", label: "Corrupción" },
  { key: "narcotráfico", emoji: "🚨", label: "Narcotráfico" },
  { key: "pobreza", emoji: "📉", label: "Pobreza" },
  { key: "inflación", emoji: "📈", label: "Inflación" },
];

interface TopicSelectorProps {
  onSelect: (topic: string) => void;
  activeTopic?: string;
}

export default function TopicSelector({ onSelect, activeTopic }: TopicSelectorProps) {
  const [customTopic, setCustomTopic] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTopic.trim()) {
      onSelect(customTopic.trim());
      setCustomTopic("");
    }
  };

  return (
    <div style={{
      padding: "1.25rem",
      background: "var(--glass-bg)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(12px)",
      marginBottom: "1rem",
    }}>
      <div style={{
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--text-muted)",
        marginBottom: "0.75rem",
        fontWeight: 600,
      }}>
        Pulso Nacional — Temas
      </div>

      {/* Chips de temas */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginBottom: "0.75rem",
      }}>
        {PRESET_TOPICS.map(topic => {
          const isActive = activeTopic === topic.key;
          return (
            <button
              key={topic.key}
              onClick={() => onSelect(topic.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                border: isActive ? "1px solid var(--accent-primary)" : "1px solid var(--glass-border)",
                background: isActive
                  ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                  : "rgba(255,255,255,0.04)",
                color: isActive ? "white" : "var(--text-secondary)",
                fontSize: "0.78rem",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "Inter, sans-serif",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive ? "0 0 12px rgba(99,102,241,0.35)" : "none",
              }}
            >
              <span>{topic.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowCustom(!showCustom)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            border: "1px dashed var(--glass-border)",
            background: showCustom ? "rgba(99,102,241,0.1)" : "transparent",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span>Otro tema...</span>
        </button>
      </div>

      {/* Input personalizado */}
      {showCustom && (
        <form onSubmit={handleCustomSubmit} style={{
          display: "flex",
          gap: "0.5rem",
          animation: "slideDown 0.2s ease",
        }}>
          <input
            type="text"
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            placeholder="Ej: medio ambiente, drogas, justicia..."
            autoFocus
            style={{
              flex: 1,
              padding: "0.5rem 0.875rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              fontFamily: "Inter, sans-serif",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "white",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Analizar
          </button>
        </form>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
