"use client";

import { PersonalityAnalysis } from "@/lib/types";
import { useState } from "react";
import Tooltip from "./Tooltip";
import { User, Zap, ShieldCheck } from "lucide-react";

export default function PoliticalNetworkGraph({ analysis }: { analysis: PersonalityAnalysis }) {
  const network = analysis.advancedMetrics?.network;
  const [hoveredNode, setHoveredNode] = useState<{name: string, reason: string, type: 'ally'|'enemy'} | null>(null);

  if (!network) return null;

  const width = 800;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  // Cálculos polares
  const allies = network.allies || [];
  const enemies = network.enemies || [];

  const getPosition = (index: number, total: number, isAlly: boolean, score: number) => {
    // Offset para alternar el radio y evitar que los nodos se choquen si todos tienen score 100
    const staggerOffset = (index % 2 === 0) ? 0 : 50;
    
    // Distancia mínima 130px (fuera del nodo central), máxima 320px
    const baseDistance = 130 + ((100 - score) / 100) * 190;
    const distance = baseDistance + staggerOffset;

    // Aumentar el ángulo de arco para que se esparzan más.
    const arcSpread = Math.PI * 0.8; 
    const startAngle = isAlly ? Math.PI - (arcSpread/2) : -(arcSpread/2);
    
    // Dividir uniformemente a lo largo del arco
    const angleStep = total > 1 ? arcSpread / (total - 1) : 0;
    const angle = startAngle + (index * angleStep);

    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance
    };
  };

  return (
    <div style={{ 
      background: "rgba(10, 14, 26, 0.6)", 
      border: "1px solid var(--glass-border)", 
      borderRadius: "var(--radius-lg)", 
      padding: "2rem",
      marginBottom: "2rem",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontFamily: "Outfit", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={24} color="var(--accent-primary)" />
            Matriz de Alianzas y Enemigos
            <Tooltip content="Grafo de red generado en tiempo real. Líneas verdes: Cooperación. Líneas rojas: Fricción actual en agenda." />
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Tablero de ajedrez estratégico de la figura.</p>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: "400px" }}>
        {/* SVG para las líneas */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <filter id="glowAlly" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowEnemy" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Líneas a Aliados */}
          {allies.map((ally, i) => {
            const score = ally.score ?? ally.strength ?? 50;
            const pos = getPosition(i, allies.length, true, score);
            const strokeW = Math.max(1, (score / 100) * 4);
            return (
              <line 
                key={`ally-line-${i}`}
                x1={centerX} y1={centerY} x2={pos.x} y2={pos.y}
                stroke="#10b981" strokeWidth={strokeW} opacity={0.6}
                filter="url(#glowAlly)"
              />
            );
          })}

          {/* Líneas a Enemigos */}
          {enemies.map((enemy, i) => {
            const score = enemy.score ?? enemy.conflictLevel ?? 50;
            const pos = getPosition(i, enemies.length, false, score);
            const strokeW = Math.max(1, (score / 100) * 4);
            return (
              <line 
                key={`enemy-line-${i}`}
                x1={centerX} y1={centerY} x2={pos.x} y2={pos.y}
                stroke="#ef4444" strokeWidth={strokeW} opacity={0.6} strokeDasharray="4 4"
                filter="url(#glowEnemy)"
              />
            );
          })}
        </svg>

        {/* Nodos (HTML superpuesto) */}
        
        {/* Nodo Central */}
        <div style={{
          position: "absolute", left: `calc(${((centerX) / width) * 100}% - 40px)`, top: `calc(${((centerY) / height) * 100}% - 40px)`,
          width: "80px", height: "80px", borderRadius: "50%", background: "var(--primary-700)", border: "2px solid var(--accent-primary)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(0, 212, 255, 0.4)", zIndex: 10
        }}>
          <User size={32} color="var(--accent-primary)" />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, marginTop: "4px", color: "white", textAlign: "center", lineHeight: 1 }}>{analysis.name.split(" ")[0]}</span>
        </div>

        {/* Aliados */}
        {allies.map((ally, i) => {
          const score = ally.score ?? ally.strength ?? 50;
          const pos = getPosition(i, allies.length, true, score);
          return (
            <div 
              key={`ally-${i}`}
              onMouseEnter={() => setHoveredNode({name: ally.name, reason: ally.reason, type: 'ally'})}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                position: "absolute", left: `calc(${((pos.x) / width) * 100}% - 20px)`, top: `calc(${((pos.y) / height) * 100}% - 20px)`,
                width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", 
                border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "help", transition: "transform 0.2s", zIndex: 5,
                transform: hoveredNode?.name === ally.name ? "scale(1.2)" : "scale(1)"
              }}
            >
              <ShieldCheck size={20} color="#10b981" />
              <span style={{ position: "absolute", bottom: "-20px", fontSize: "0.65rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {ally.name}
              </span>
            </div>
          );
        })}

        {/* Enemigos */}
        {enemies.map((enemy, i) => {
          const score = enemy.score ?? enemy.conflictLevel ?? 50;
          const pos = getPosition(i, enemies.length, false, score);
          return (
            <div 
              key={`enemy-${i}`}
              onMouseEnter={() => setHoveredNode({name: enemy.name, reason: enemy.reason, type: 'enemy'})}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                position: "absolute", left: `calc(${((pos.x) / width) * 100}% - 20px)`, top: `calc(${((pos.y) / height) * 100}% - 20px)`,
                width: "40px", height: "40px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", 
                border: "2px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "help", transition: "transform 0.2s", zIndex: 5,
                transform: hoveredNode?.name === enemy.name ? "scale(1.2)" : "scale(1)"
              }}
            >
              <Zap size={20} color="#ef4444" />
              <span style={{ position: "absolute", bottom: "-20px", fontSize: "0.65rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                {enemy.name}
              </span>
            </div>
          );
        })}

        {/* Info Panel Hover */}
        {hoveredNode && (
          <div style={{
            position: "absolute", bottom: "1rem", left: "50%", transform: "translateX(-50%)",
            background: "rgba(10, 14, 26, 0.9)", border: `1px solid ${hoveredNode.type === 'ally' ? '#10b981' : '#ef4444'}`,
            padding: "1rem", borderRadius: "8px", maxWidth: "400px", zIndex: 20, textAlign: "center"
          }}>
            <h4 style={{ color: hoveredNode.type === 'ally' ? '#10b981' : '#ef4444', marginBottom: "0.5rem", fontWeight: 700 }}>
              {hoveredNode.name}
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{hoveredNode.reason}</p>
          </div>
        )}

      </div>
    </div>
  );
}
