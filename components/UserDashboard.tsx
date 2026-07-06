"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { PersonalityAnalysis } from "@/lib/types";
import { Clock, TrendingUp } from "lucide-react";
import { ARCHETYPE_CONFIG } from "@/lib/utils";

export default function UserDashboard({ onSelectAnalysis }: { onSelectAnalysis: (a: PersonalityAnalysis) => void }) {
  const { user, session } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("saved_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [user, supabase]);

  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="glass-card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: "Outfit", fontSize: "1.4rem", color: "var(--accent-primary)", marginBottom: "0.2rem" }}>
            Mi Panel PRO
          </h2>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Usuario: {user.email}
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            padding: "0.4rem 0.8rem",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Cerrar Sesión
        </button>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Clock size={16} color="var(--text-secondary)" />
          <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Historial de Análisis
          </h3>
        </div>

        {loading ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cargando historial...</div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)" }}>
            Todavía no guardaste ningún análisis. Buscá a una personalidad para empezar.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
            {history.map((item) => {
              const data = item.analysis_data as PersonalityAnalysis;
              const arch = ARCHETYPE_CONFIG[data.archetype] || ARCHETYPE_CONFIG.sage;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => onSelectAnalysis(data)}
                  style={{
                    minWidth: "220px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${arch.color}50`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>{arch.emoji}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>
                    {data.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: arch.color, marginBottom: "0.75rem" }}>
                    {arch.label}
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <TrendingUp size={12} color={data.sentimentOverall > 0 ? "#10b981" : "#ef4444"} />
                    Sentimiento: {Math.round(data.sentimentOverall * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
