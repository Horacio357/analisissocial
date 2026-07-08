"use client";

import { PersonalityAnalysis } from "@/lib/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";

export default function PredictiveTimeline({ analysis }: { analysis: PersonalityAnalysis }) {
  const timeline = analysis.advancedMetrics?.timeline;

  if (!timeline || timeline.length === 0) return null;

  // Analizar la pendiente de la disonancia para la "Alerta Predictiva"
  const recentTimeline = timeline.slice(-2); // Últimos dos meses
  let hasAlert = false;
  let alertMessage = "";

  if (recentTimeline.length === 2) {
    const diffDissonance = recentTimeline[1].dissonance - recentTimeline[0].dissonance;
    if (diffDissonance >= 5 && recentTimeline[1].dissonance > 60) {
      hasAlert = true;
      alertMessage = "Riesgo inminente de estallido mediático si la tendencia no se quiebra.";
    } else if (diffDissonance >= 10) {
      hasAlert = true;
      alertMessage = "Crecimiento peligroso y acelerado en la disonancia cognitiva.";
    }
  }

  return (
    <div style={{ 
      background: "rgba(10, 14, 26, 0.6)", 
      border: "1px solid var(--glass-border)", 
      borderRadius: "var(--radius-lg)", 
      padding: "2rem",
      marginBottom: "2rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ fontFamily: "Outfit", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={24} color="var(--accent-primary)" />
            Línea de Tiempo Predictiva
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Evolución histórica de los últimos 6 meses (Estimación IA).</p>
        </div>

        {hasAlert && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", 
            padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem",
            animation: "pulseRed 2s infinite"
          }}>
            <AlertTriangle size={24} color="#ef4444" />
            <div>
              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em" }}>ALERTA PREDICTIVA</div>
              <div style={{ color: "var(--text-primary)", fontSize: "0.8rem", maxWidth: "250px" }}>{alertMessage}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorApproval" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDissonance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
            <RechartsTooltip 
              contentStyle={{ background: "rgba(10, 14, 26, 0.9)", border: "1px solid var(--glass-border)", borderRadius: "8px" }}
              itemStyle={{ color: "var(--text-primary)", fontSize: "0.85rem" }}
              labelStyle={{ color: "var(--text-muted)", marginBottom: "0.5rem" }}
            />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="approval" name="Aprobación" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorApproval)" />
            <Area type="monotone" dataKey="dissonance" name="Disonancia" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorDissonance)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }} />
          Aprobación
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f43f5e" }} />
          Disonancia Cognitiva
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}} />
    </div>
  );
}
