"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode; // If provided, wraps an element. If not, renders a ? icon.
  position?: "top" | "bottom" | "left" | "right";
  width?: string;
}

export default function Tooltip({ content, children, position = "top", width = "250px" }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Determinar estilos de posición
  let posStyles = {};
  switch (position) {
    case "top":
      posStyles = { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "8px" };
      break;
    case "bottom":
      posStyles = { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px" };
      break;
    case "left":
      posStyles = { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: "8px" };
      break;
    case "right":
      posStyles = { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: "8px" };
      break;
  }

  return (
    <div 
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children || <HelpCircle size={14} color="var(--text-muted)" style={{ opacity: 0.7 }} />}

      {isHovered && (
        <div style={{
          position: "absolute",
          ...posStyles,
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          padding: "0.75rem",
          borderRadius: "var(--radius-md)",
          width,
          zIndex: 50,
          color: "var(--text-secondary)",
          fontSize: "0.75rem",
          lineHeight: 1.5,
          fontWeight: 400,
          textAlign: "left",
          pointerEvents: "none",
          animation: "fadeIn 0.2s ease forwards",
        }}>
          {content}
        </div>
      )}
    </div>
  );
}
