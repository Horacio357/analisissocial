import { ArchetypeKey, PersonalityAnalysis } from "./types";

const CACHE_KEY_PREFIX = "ojo_social_analysis_";
const CACHE_EXPIRY_DAYS = 30;

// ─── Archetype Analysis ─────────────────────────────────────────────────────

export const ARCHETYPE_CONFIG: Record<ArchetypeKey, { label: string; color: string; emoji: string; description: string }> = {
  hero: {
    label: "Héroe",
    color: "#f59e0b",
    emoji: "⚡",
    description: "Figura que inspira, protege y representa los valores más aspiracionales del colectivo.",
  },
  villain: {
    label: "Villano",
    color: "#ef4444",
    emoji: "🔥",
    description: "Catalizador de conflicto y proyección del rechazo colectivo. Alta polarización.",
  },
  sage: {
    label: "Sabio",
    color: "#8b5cf6",
    emoji: "🔮",
    description: "Referente de conocimiento y guía moral. Alta confianza, baja movilización emocional.",
  },
  trickster: {
    label: "Tramposo",
    color: "#f97316",
    emoji: "🎭",
    description: "Disruptor del statu quo. Impredecible, polarizante y altamente movilizador.",
  },
  guardian: {
    label: "Guardián",
    color: "#3b82f6",
    emoji: "🛡️",
    description: "Figura de estabilidad y protección institucional. Alta coherencia y confianza moderada.",
  },
};

// ─── Sentiment Utils ─────────────────────────────────────────────────────────

export function sentimentToColor(sentiment: number): string {
  if (sentiment > 0.5) return "#10b981";
  if (sentiment > 0.2) return "#34d399";
  if (sentiment > -0.2) return "#6b7280";
  if (sentiment > -0.5) return "#f97316";
  return "#ef4444";
}

export function sentimentToLabel(sentiment: number): string {
  if (sentiment > 0.5) return "Muy positivo";
  if (sentiment > 0.2) return "Positivo";
  if (sentiment > -0.2) return "Neutro";
  if (sentiment > -0.5) return "Negativo";
  return "Muy negativo";
}

export function sentimentToPercent(sentiment: number): number {
  return Math.round(((sentiment + 1) / 2) * 100);
}

// ─── Cache Utils ─────────────────────────────────────────────────────────────

export function getCachedAnalysis(personId: string): PersonalityAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + personId);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersonalityAnalysis;
    const analyzedAt = new Date(data.analyzedAt);
    const expiryDate = new Date(analyzedAt);
    expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS);
    if (new Date() > expiryDate) return null; // expirado
    return data;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(analysis: PersonalityAnalysis): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + analysis.id, JSON.stringify(analysis));
  } catch {
    // Si localStorage está lleno, ignorar
  }
}

export function isAnalysisExpired(analyzedAt: string, isPremium = false): boolean {
  const analyzedDate = new Date(analyzedAt);
  const now = new Date();
  const diffDays = (now.getTime() - analyzedDate.getTime()) / (1000 * 60 * 60 * 24);
  return isPremium ? diffDays > 1 : diffDays > 30;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 30) return `hace ${diffDays}d`;
  return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? "es" : ""}`;
}

// ─── Personality ID Utils ─────────────────────────────────────────────────────

export function nameToId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── Radar Chart Data ─────────────────────────────────────────────────────────

export function metricsToRadarData(metrics: PersonalityAnalysis["metrics"]) {
  return [
    { subject: "Aprobación", value: metrics.approval, fullMark: 100 },
    { subject: "Polarización", value: metrics.polarization, fullMark: 100 },
    { subject: "Movilización", value: metrics.mobilization, fullMark: 100 },
    { subject: "Coherencia", value: metrics.coherence, fullMark: 100 },
    { subject: "Resonancia", value: metrics.resonance, fullMark: 100 },
    { subject: "Confianza", value: metrics.trust, fullMark: 100 },
  ];
}
