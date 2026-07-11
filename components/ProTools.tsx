"use client";

import { useState } from "react";
import { Download, Mail, X, Check, Loader2, Send } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface ProToolsProps {
  targetId: string;
  reportName: string;
}

export default function ProTools({ targetId, reportName }: ProToolsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Función para generar el PDF a partir del HTML
  const generatePdfBase64 = async (): Promise<string | null> => {
    const element = document.getElementById(targetId);
    if (!element) return null;

    try {
      // Tomamos la "foto" del elemento HTML
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        style: { background: '#0a0e1a' },
        pixelRatio: 2 // Mayor calidad
      });

      // Dimensiones de la imagen
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => (img.onload = resolve));

      // Creamos el PDF (A4)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Retornar en formato Base64 para adjuntar o descargar
      return pdf.output("datauristring");
    } catch (err) {
      console.error("Error al generar PDF", err);
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    const pdfBase64 = await generatePdfBase64();
    if (pdfBase64) {
      // Crear un link falso para descargar
      const link = document.createElement("a");
      link.href = pdfBase64;
      link.download = `Reporte_${reportName.replace(/\s+/g, "_")}.pdf`;
      link.click();
    }
    setIsGenerating(false);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    setSendStatus("idle");
    setErrorMessage("");

    const pdfBase64 = await generatePdfBase64();
    if (!pdfBase64) {
      setSendStatus("error");
      setErrorMessage("No se pudo generar el reporte.");
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch("/api/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: `Reporte Analítico: ${reportName} - Proyecto Talos`,
          message,
          pdfBase64,
          filename: `Reporte_${reportName.replace(/\s+/g, "_")}.pdf`
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendStatus("success");
        setTimeout(() => {
          setShowEmailModal(false);
          setSendStatus("idle");
          setEmail("");
          setMessage("");
        }, 3000);
      } else {
        setSendStatus("error");
        setErrorMessage(data.error || "Ocurrió un error al enviar el correo.");
      }
    } catch (error) {
      setSendStatus("error");
      setErrorMessage("Error de conexión al enviar el correo.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div style={{
        display: "flex", gap: "1rem", flexWrap: "wrap",
        background: "rgba(0, 212, 255, 0.05)",
        border: "1px solid rgba(0, 212, 255, 0.2)",
        padding: "1rem",
        borderRadius: "var(--radius-md)",
        marginBottom: "2rem",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h4 style={{ fontFamily: "Outfit", fontWeight: 700, color: "var(--accent-primary)", fontSize: "0.95rem" }}>
            ⭐ Herramientas PRO
          </h4>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Exportá este análisis territorial a formato PDF o envialo directo al cliente.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)",
              color: "var(--text-primary)", padding: "0.5rem 1rem", borderRadius: "8px",
              cursor: isGenerating ? "wait" : "pointer", fontSize: "0.8rem", fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isGenerating ? "Generando..." : "Descargar PDF"}
          </button>
          
          <button
            onClick={() => setShowEmailModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "var(--accent-primary)", color: "#000", border: "none",
              padding: "0.5rem 1rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "0.8rem", fontWeight: 700,
              boxShadow: "0 0 10px rgba(0,212,255,0.3)", transition: "all 0.2s"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(0,212,255,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 10px rgba(0,212,255,0.3)"; }}
          >
            <Mail size={14} />
            Enviar por Email
          </button>
        </div>
      </div>

      {/* Modal Envío por Email */}
      {showEmailModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)",
        }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "450px", margin: "1rem", position: "relative" }}>
            <button
              onClick={() => !isSending && setShowEmailModal(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "transparent", border: "none", color: "var(--text-muted)",
                cursor: "pointer", padding: "0.2rem"
              }}
            >
              <X size={18} />
            </button>
            
            <h3 style={{ fontFamily: "Outfit", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Enviar Reporte por Email
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Se generará un PDF de alta calidad que llegará como archivo adjunto.
            </p>

            <form onSubmit={handleSendEmail} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.3rem", color: "var(--text-secondary)" }}>
                  Email del destinatario *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@agencia.com"
                  style={{
                    width: "100%", padding: "0.7rem", borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
                    color: "white", outline: "none", fontSize: "0.9rem"
                  }}
                  disabled={isSending || sendStatus === "success"}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.3rem", color: "var(--text-secondary)" }}>
                  Mensaje opcional
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Adjunto el último informe territorial de Proyecto Talos..."
                  rows={3}
                  style={{
                    width: "100%", padding: "0.7rem", borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
                    color: "white", outline: "none", fontSize: "0.9rem", resize: "none"
                  }}
                  disabled={isSending || sendStatus === "success"}
                />
              </div>

              {sendStatus === "error" && (
                <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.8rem" }}>
                  {errorMessage}
                </div>
              )}

              {sendStatus === "success" && (
                <div style={{ padding: "0.75rem", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", color: "#10b981", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Check size={16} /> ¡Reporte enviado exitosamente!
                </div>
              )}

              <button
                type="submit"
                disabled={isSending || sendStatus === "success" || !email}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  padding: "0.8rem", borderRadius: "8px", border: "none",
                  background: sendStatus === "success" ? "#10b981" : "var(--accent-primary)",
                  color: "#000", fontWeight: 700, fontSize: "0.9rem", cursor: isSending ? "wait" : "pointer",
                  marginTop: "0.5rem", transition: "all 0.2s"
                }}
              >
                {isSending ? (
                  <><Loader2 size={16} className="animate-spin" /> Generando y Enviando...</>
                ) : sendStatus === "success" ? (
                  <><Check size={16} /> Enviado</>
                ) : (
                  <><Send size={16} /> Enviar Reporte</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
