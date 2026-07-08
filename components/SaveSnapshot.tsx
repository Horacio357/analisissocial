"use client";

import { useState } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { PersonalityAnalysis } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface SaveSnapshotProps {
  analysis: PersonalityAnalysis;
  userId: string;
}

const TAGS = [
  "Contexto Normal",
  "Pre-Campaña",
  "Campaña Activa",
  "Crisis / Escándalo",
  "Post-Debate",
  "Medición Rutinaria"
];

export default function SaveSnapshot({ analysis, userId }: SaveSnapshotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(TAGS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const supabase = createClient();

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      // Modificamos el nombre o agregamos metadata para identificar que es un snapshot
      const snapshotAnalysis = {
        ...analysis,
        snapshotTag: selectedTag,
        savedAt: new Date().toISOString()
      };

      const { error } = await supabase.from("saved_analyses").insert({
        user_id: userId,
        personality_name: `${analysis.name} [${selectedTag}]`,
        analysis_data: snapshotAnalysis
      });

      if (error) throw error;
      
      setSaveStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setSaveStatus("idle");
      }, 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "var(--accent-primary)", color: "#000", border: "none",
          padding: "0.5rem 1rem", borderRadius: "8px",
          cursor: "pointer", fontSize: "0.8rem", fontWeight: 700,
          boxShadow: "0 0 10px rgba(0,212,255,0.3)", transition: "all 0.2s"
        }}
      >
        <Save size={14} />
        Guardar Snapshot
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: "0.5rem",
          background: "rgba(13,21,40,0.95)", border: "1px solid rgba(0,212,255,0.3)",
          backdropFilter: "blur(12px)", padding: "1rem", borderRadius: "var(--radius-md)",
          width: "240px", zIndex: 100, boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}>
          <h4 style={{ fontSize: "0.85rem", color: "white", marginBottom: "0.5rem", fontWeight: 600 }}>
            Etiqueta del Contexto
          </h4>
          <select 
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            style={{
              width: "100%", padding: "0.5rem", borderRadius: "4px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "white", fontSize: "0.8rem", marginBottom: "1rem", outline: "none"
            }}
          >
            {TAGS.map(t => <option key={t} value={t} style={{ background: "#0f172a" }}>{t}</option>)}
          </select>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              background: saveStatus === "success" ? "#10b981" : "var(--accent-primary)", 
              color: "#000", border: "none",
              padding: "0.5rem", borderRadius: "4px",
              cursor: isSaving ? "wait" : "pointer", fontSize: "0.8rem", fontWeight: 700,
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : 
             saveStatus === "success" ? <Check size={14} /> : 
             <Save size={14} />}
            {saveStatus === "success" ? "Guardado" : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
