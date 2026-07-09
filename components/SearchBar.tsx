"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { PersonalityAnalysis } from "@/lib/types";
import { ARCHETYPE_CONFIG } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const SUGGESTIONS = [
  "Javier Milei", "Lionel Messi", "Cristina Kirchner", "Mauricio Macri",
  "Alberto Fernández", "Sergio Massa", "Victoria Villarruel", "Patricia Bullrich",
  "Karina Milei", "Axel Kicillof", "Diego Santilli", "Roberto Lavagna",
  "Jorge Lanata", "Susana Giménez", "Marcelo Tinelli", "River Plate",
  "Boca Juniors", "San Lorenzo", "Racing Club", "Independiente",
];

interface SearchBarProps {
  onResult: (analysis: PersonalityAnalysis) => void;
  onLoading?: (loading: boolean) => void;
}

export default function SearchBar({ onResult, onLoading }: SearchBarProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtered, setFiltered] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length > 1) {
      const f = SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()));
      setFiltered(f.slice(0, 6));
      setShowSuggestions(f.length > 0);
    } else {
      setFiltered([]);
      setShowSuggestions(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAnalyze = useCallback(async (name: string) => {
    if (!name.trim()) return;

    if (!user) {
      // Premium liberado temporalmente para pruebas.
    }

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);
    onLoading?.(true);

    try {
      const res = await fetch(`/api/analyze?name=${encodeURIComponent(name.trim())}`);
      if (!res.ok) throw new Error("Error al contactar con el motor IA. Por favor, intentá de nuevo más tarde.");
      const data: PersonalityAnalysis = await res.json();
      onResult(data);
      setQuery(data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado. Por favor, intentá más tarde.");
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  }, [onResult, onLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAnalyze(query);
    if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setError(null);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "640px", margin: "0 auto" }} ref={wrapperRef}>
      {/* Input container */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        background: "rgba(13, 21, 40, 0.9)",
        border: `1px solid ${error ? "rgba(239,68,68,0.5)" : showSuggestions ? "rgba(0,212,255,0.35)" : "rgba(0,212,255,0.15)"}`,
        borderRadius: "var(--radius-xl)",
        padding: "0.875rem 1.25rem",
        transition: "all 0.3s ease",
        backdropFilter: "blur(20px)",
        boxShadow: showSuggestions ? "0 0 32px rgba(0,212,255,0.15)" : "var(--shadow-md)",
      }}>
        <Search size={20} color={isLoading ? "var(--accent-primary)" : "var(--text-muted)"} strokeWidth={2} style={{ flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 1 && setShowSuggestions(filtered.length > 0)}
          placeholder="Buscar personalidad: Messi, Milei, Macri..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: "1rem",
            fontFamily: "Inter, sans-serif",
          }}
          id="personality-search-input"
          autoComplete="off"
        />

        {query && !isLoading && (
          <button onClick={clearSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px", display: "flex", alignItems: "center" }}>
            <X size={16} />
          </button>
        )}

        {isLoading ? (
          <Loader2 size={20} color="var(--accent-primary)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
        ) : (
          <button
            onClick={() => handleAnalyze(query)}
            className="btn-primary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "var(--radius-md)", flexShrink: 0 }}
            disabled={!query.trim()}
          >
            Analizar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "var(--heat-hot)", fontSize: "0.8rem", marginTop: "0.5rem", paddingLeft: "0.5rem" }}>
          ⚠️ {error}
        </p>
      )}

      {/* Sugerencias */}
      {showSuggestions && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          background: "rgba(10, 14, 26, 0.97)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-lg)",
          backdropFilter: "blur(20px)",
          zIndex: 50,
          overflow: "hidden",
          animation: "fadeInUp 0.2s ease both",
          boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--accent-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <TrendingUp size={12} /> Sugerencias
            </span>
          </div>
          {filtered.map((s, i) => (
            <button
              key={i}
              onClick={() => handleAnalyze(s)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.15s",
                fontSize: "0.9rem",
                fontFamily: "Inter, sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>{s}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      )}

      {/* Tags de acceso rápido */}
      {!query && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", marginBottom: "0.75rem", justifyContent: "center" }}>
          {["Messi", "Milei", "Cristina Kirchner", "Macri", "Susana Giménez"].map(name => {
            // Determinar color del arquetipo
            const archetypeColors: Record<string, string> = {
              "Messi": "var(--archetype-hero)",
              "Milei": "var(--archetype-trickster)",
              "Cristina Kirchner": "var(--archetype-villain)",
              "Macri": "var(--archetype-guardian)",
              "Susana Giménez": "var(--archetype-sage)",
            };
            const archetypeEmojis: Record<string, string> = {
              "Messi": "⚡",
              "Milei": "🎭",
              "Cristina Kirchner": "🔥",
              "Macri": "🛡️",
              "Susana Giménez": "🔮",
            };
            return (
              <button
                key={name}
                onClick={() => handleAnalyze(name)}
                style={{
                  padding: "0.3rem 0.75rem",
                  background: "rgba(13,21,40,0.8)",
                  border: `1px solid ${archetypeColors[name]}33`,
                  borderRadius: "100px",
                  color: archetypeColors[name],
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${archetypeColors[name]}15`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,21,40,0.8)"; }}
              >
                {archetypeEmojis[name]} {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
