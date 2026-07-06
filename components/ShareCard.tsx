"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import {
  Share2, X, Copy, Check, MessageCircle,
  Link, Download, Globe
} from "lucide-react";
import { PersonalityAnalysis } from "@/lib/types";
import { ARCHETYPE_CONFIG, sentimentToLabel, sentimentToColor } from "@/lib/utils";

interface ShareCardProps {
  analysis: PersonalityAnalysis;
  compareAnalysis?: PersonalityAnalysis | null;
}

export default function ShareCard({ analysis, compareAnalysis }: ShareCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const archConf = ARCHETYPE_CONFIG[analysis.archetype];
  const compareConf = compareAnalysis ? ARCHETYPE_CONFIG[compareAnalysis.archetype] : null;

  // Texto para compartir
  const buildShareText = () => {
    if (compareAnalysis) {
      return `📊 Comparativa Ojo Social
${analysis.name} (${archConf.emoji} ${archConf.label}) vs ${compareAnalysis.name} (${compareConf!.emoji} ${compareConf!.label})

• Aprobación: ${analysis.metrics.approval} vs ${compareAnalysis.metrics.approval}
• Polarización: ${analysis.metrics.polarization} vs ${compareAnalysis.metrics.polarization}
• Confianza: ${analysis.metrics.trust} vs ${compareAnalysis.metrics.trust}

Analizá el pulso social argentino en: ojosocial.ar`;
    }
    return `🔍 Análisis Ojo Social: ${analysis.name}
${archConf.emoji} Arquetipo: ${archConf.label} (${analysis.archetypeScore}% confianza)
📊 Aprobación: ${analysis.metrics.approval}/100
⚡ Polarización: ${analysis.metrics.polarization}/100
🤝 Confianza: ${analysis.metrics.trust}/100
📣 "${analysis.summary.slice(0, 100)}..."

Analizá el pulso social argentino en: ojosocial.ar`;
  };

  const shareText = buildShareText();
  const encodedText = encodeURIComponent(shareText);
  const pageUrl = encodeURIComponent("https://ojosocial.ar");

  const SHARE_OPTIONS = [
    {
      label: "Twitter / X",
      icon: <Link size={16} />,
      color: "#1d9bf0",
      bg: "rgba(29,155,240,0.1)",
      border: "rgba(29,155,240,0.25)",
      href: `https://twitter.com/intent/tweet?text=${encodedText}`,
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle size={16} />,
      color: "#25d366",
      bg: "rgba(37,211,102,0.1)",
      border: "rgba(37,211,102,0.25)",
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      label: "Telegram",
      icon: <MessageCircle size={16} />,
      color: "#229ed9",
      bg: "rgba(34,158,217,0.1)",
      border: "rgba(34,158,217,0.25)",
      href: `https://t.me/share/url?url=${pageUrl}&text=${encodedText}`,
    },
    {
      label: "Facebook",
      icon: <Globe size={16} />,
      color: "#1877f2",
      bg: "rgba(24,119,242,0.1)",
      border: "rgba(24,119,242,0.25)",
      href: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${encodedText}`,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: seleccionar el texto
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Análisis Ojo Social: ${analysis.name}`,
          text: shareText,
          url: "https://ojosocial.ar",
        });
      } catch { /* cancelado por el usuario */ }
    } else {
      setOpen(true);
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, style: { background: '#09090b' } });
      const link = document.createElement("a");
      link.download = `ojo-social-${analysis.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al generar imagen", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Botón trigger */}
      <button
        onClick={() => {
          if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            handleNativeShare();
          } else {
            setOpen(true);
          }
        }}
        className="btn-ghost"
        style={{ padding: "0.45rem 0.875rem", fontSize: "0.78rem", gap: "0.4rem" }}
        title="Compartir análisis"
      >
        <Share2 size={13} />
        Compartir
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            animation: "fadeIn 0.2s ease both",
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%", maxWidth: "440px", margin: "1rem",
              border: "1px solid rgba(0,212,255,0.2)",
              animation: "fadeInUp 0.25s ease both",
              position: "relative",
            }}
          >
            {/* Cerrar */}
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)",
                borderRadius: "8px", padding: "0.3rem", cursor: "pointer",
                display: "flex", alignItems: "center", color: "var(--text-muted)",
              }}
            >
              <X size={14} />
            </button>

            <div className="section-label" style={{ marginBottom: "0.4rem" }}>
              <Share2 size={11} /> Compartir análisis
            </div>
            <h3 style={{ fontFamily: "Outfit", fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem" }}>
              {compareAnalysis
                ? `${analysis.name} vs ${compareAnalysis.name}`
                : analysis.name}
            </h3>

            {/* Preview card */}
            <div ref={cardRef} style={{
              padding: "1rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "1.25rem",
            }}>
              {compareAnalysis ? (
                /* Comparativa */
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.5rem", alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem" }}>{archConf.emoji}</div>
                    <div style={{ fontFamily: "Outfit", fontSize: "0.85rem", fontWeight: 800, color: archConf.color }}>
                      {analysis.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{archConf.label}</div>
                    <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {["approval","trust","polarization"].map(k => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                            {k === "approval" ? "Aprobación" : k === "trust" ? "Confianza" : "Polariz."}
                          </span>
                          <span style={{ fontSize: "0.72rem", fontFamily: "Outfit", fontWeight: 700, color: archConf.color }}>
                            {analysis.metrics[k as keyof typeof analysis.metrics]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "Outfit", fontSize: "1rem", fontWeight: 900,
                    background: "linear-gradient(135deg, var(--accent-primary), #a78bfa)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>VS</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem" }}>{compareConf!.emoji}</div>
                    <div style={{ fontFamily: "Outfit", fontSize: "0.85rem", fontWeight: 800, color: compareConf!.color }}>
                      {compareAnalysis.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{compareConf!.label}</div>
                    <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {["approval","trust","polarization"].map(k => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                            {k === "approval" ? "Aprobación" : k === "trust" ? "Confianza" : "Polariz."}
                          </span>
                          <span style={{ fontSize: "0.72rem", fontFamily: "Outfit", fontWeight: 700, color: compareConf!.color }}>
                            {compareAnalysis.metrics[k as keyof typeof compareAnalysis.metrics]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Análisis individual */
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "2rem" }}>{archConf.emoji}</div>
                    <div>
                      <div style={{ fontFamily: "Outfit", fontSize: "1rem", fontWeight: 800 }}>{analysis.name}</div>
                      <span className={`badge badge-${analysis.archetype}`} style={{ fontSize: "0.62rem" }}>
                        {archConf.label}
                      </span>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{
                        fontSize: "1.5rem", fontFamily: "Outfit", fontWeight: 900,
                        color: sentimentToColor(analysis.sentimentOverall),
                      }}>
                        {analysis.metrics.approval}
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>aprobación</div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{analysis.summary.slice(0, 110)}..."
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {[
                      { label: "Polarización", val: analysis.metrics.polarization, c: "#f97316" },
                      { label: "Resonancia", val: analysis.metrics.resonance, c: "var(--accent-primary)" },
                      { label: "Confianza", val: analysis.metrics.trust, c: "#34d399" },
                    ].map(m => (
                      <div key={m.label} style={{
                        flex:1, minWidth:"70px", padding:"0.3rem 0.4rem",
                        background:"rgba(255,255,255,0.03)", borderRadius:"6px", textAlign:"center",
                      }}>
                        <div style={{ fontSize:"0.85rem", fontFamily:"Outfit", fontWeight:800, color:m.c }}>{m.val}</div>
                        <div style={{ fontSize:"0.58rem", color:"var(--text-muted)" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Watermark */}
              <div style={{
                marginTop: "0.75rem", paddingTop: "0.5rem",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "0.6rem", color: "var(--accent-primary)", fontWeight: 700, fontFamily: "Outfit" }}>
                  👁 Ojo Social
                </span>
                <span style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>ojosocial.ar</span>
              </div>
            </div>

            {/* Botones de redes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
              {SHARE_OPTIONS.map(opt => (
                <a
                  key={opt.label}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.6rem 0.75rem",
                    background: opt.bg, border: `1px solid ${opt.border}`,
                    borderRadius: "var(--radius-md)", color: opt.color,
                    textDecoration: "none", fontSize: "0.8rem", fontWeight: 600,
                    fontFamily: "Outfit", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  {opt.icon}
                  {opt.label}
                </a>
              ))}
            </div>

            {/* Copiar texto */}
            <button
              onClick={handleCopy}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", padding: "0.65rem",
                background: copied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "var(--radius-md)", color: copied ? "#34d399" : "var(--text-secondary)",
                cursor: "pointer", fontSize: "0.82rem", fontFamily: "Outfit",
                fontWeight: 600, transition: "all 0.2s",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "¡Copiado al portapapeles!" : "Copiar texto del análisis"}
            </button>
            {/* Descargar Imagen */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", padding: "0.65rem",
                background: "rgba(167,139,250,0.1)",
                border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: "var(--radius-md)", color: "#a78bfa",
                cursor: isDownloading ? "wait" : "pointer", fontSize: "0.82rem", fontFamily: "Outfit",
                fontWeight: 600, transition: "all 0.2s", marginTop: "0.5rem"
              }}
            >
              <Download size={14} />
              {isDownloading ? "Generando imagen..." : "Descargar como imagen (Para Instagram)"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
