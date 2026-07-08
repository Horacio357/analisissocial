"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, CheckCircle2 } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import { MOCK_PROVINCE_SENTIMENTS } from "@/lib/types";
import { sentimentToColor, sentimentToLabel } from "@/lib/utils";

interface PulseZone {
  name: string;
  sentiment: number;
  intensity: number;
}

interface PulseData {
  nationalSentiment: number;
  positiveProvinces: number;
  negativeProvinces: number;
  alertZones: PulseZone[];
  consensusZones: PulseZone[];
}

function computePulse(): PulseData {
  const values = Object.values(MOCK_PROVINCE_SENTIMENTS);
  const avg = values.reduce((a, b) => a + b.sentiment, 0) / values.length;
  const positiveProvinces = values.filter(p => p.sentiment > 0.1).length;
  const negativeProvinces = values.filter(p => p.sentiment < -0.1).length;

  const alertZones = Object.entries(MOCK_PROVINCE_SENTIMENTS)
    .filter(([, v]) => v.sentiment < -0.3 && v.intensity > 0.5)
    .sort((a, b) => a[1].sentiment - b[1].sentiment)
    .slice(0, 3)
    .map(([k, v]) => ({
      name: k.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      sentiment: v.sentiment,
      intensity: v.intensity
    }));

  const consensusZones = Object.entries(MOCK_PROVINCE_SENTIMENTS)
    .filter(([, v]) => v.sentiment > 0.3 && v.intensity > 0.4)
    .sort((a, b) => b[1].sentiment - a[1].sentiment)
    .slice(0, 3)
    .map(([k, v]) => ({
      name: k.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      sentiment: v.sentiment,
      intensity: v.intensity
    }));

  return { nationalSentiment: avg, positiveProvinces, negativeProvinces, alertZones, consensusZones };
}

export default function SocialPulse() {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setPulse(computePulse());
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!pulse) return null;

  const sentColor = sentimentToColor(pulse.nationalSentiment);
  const sentPct = Math.round(((pulse.nationalSentiment + 1) / 2) * 100);
  const isPositive = pulse.nationalSentiment > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* KPI Principal */}
      <div className="glass-card" style={{
        border: `1px solid ${sentColor}30`,
        background: `linear-gradient(135deg, rgba(13,21,40,0.9), ${sentColor}08)`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="section-label" style={{ marginBottom: "0.4rem" }}>
              <Activity size={12} /> Pulso Nacional
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "2.8rem", fontFamily: "Outfit", fontWeight: 900, color: sentColor, lineHeight: 1 }}>
                {sentPct}
              </span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>puntos de calor</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: sentColor }}>
                  {sentimentToLabel(pulse.nationalSentiment)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span className="status-dot status-live" />
            <span style={{ fontSize: "0.7rem", color: "var(--heat-cold)" }}>EN VIVO</span>
          </div>
        </div>

        {/* Barra de sentimiento */}
        <div style={{ marginTop: "1rem" }}>
          <div className="progress-bar" style={{ height: "8px", borderRadius: "4px" }}>
            <div style={{
              height: "100%",
              width: `${sentPct}%`,
              background: `linear-gradient(90deg, #ef4444 0%, #6b7280 50%, #10b981 100%)`,
              borderRadius: "4px",
              transition: "width 1.5s cubic-bezier(0.4,0,0.2,1)",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: sentColor,
                border: "2px solid var(--primary-900)",
                boxShadow: `0 0 8px ${sentColor}`,
              }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>😤 Crisis</span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>😊 Consenso</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="responsive-grid-2" style={{ gap: "0.75rem" }}>
        <div className="glass-card" style={{ padding: "1rem", border: "1px solid rgba(52,211,153,0.2)" }}>
          <TrendingUp size={16} color="#34d399" style={{ marginBottom: "0.4rem" }} />
          <div style={{ fontSize: "1.6rem", fontFamily: "Outfit", fontWeight: 800, color: "#34d399" }}>
            {pulse.positiveProvinces}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Provincias en consenso
            <Tooltip content="Zonas donde la figura mantiene un nivel de sentimiento predominantemente positivo y estable." />
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1rem", border: "1px solid rgba(239,68,68,0.2)" }}>
          <TrendingDown size={16} color="#ef4444" style={{ marginBottom: "0.4rem" }} />
          <div style={{ fontSize: "1.6rem", fontFamily: "Outfit", fontWeight: 800, color: "#ef4444" }}>
            {pulse.negativeProvinces}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            Focos de descontento
            <Tooltip content="Regiones donde el sentimiento negativo es sostenido. Alta probabilidad de conflicto social o resistencia a la narrativa de la figura." />
          </div>
        </div>
      </div>

      {/* Zonas de alerta */}
      {pulse.alertZones.length > 0 && (
        <div className="glass-card" style={{ padding: "1rem", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <AlertTriangle size={14} color="#f97316" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f97316" }}>
              Zonas de Alerta
            </span>
            <Tooltip content="Provincias con picos de negatividad de muy alta intensidad (viralización agresiva)." position="right" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {pulse.alertZones.map((zone, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{zone.name}</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "Outfit", fontWeight: 700, color: "#ef4444" }}>
                  Intensidad: {Math.round(zone.intensity * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zonas de consenso */}
      {pulse.consensusZones.length > 0 && (
        <div className="glass-card" style={{ padding: "1rem", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <CheckCircle size={14} color="#10b981" />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981" }}>
              Zonas de Consenso
            </span>
            <Tooltip content="Provincias con picos de positividad estables y alta aprobación." position="right" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {pulse.consensusZones.map((zone, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{zone.name}</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontFamily: "Outfit", fontWeight: 700, color: "#10b981" }}>
                  Aprobación: {Math.round(((zone.sentiment + 1) / 2) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Última actualización */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
          Datos actualizados · {new Date().toLocaleDateString("es-AR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
