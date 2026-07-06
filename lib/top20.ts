import { PersonalityAnalysis, MOCK_PROVINCE_SENTIMENTS, ArchetypeKey } from "./types";

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

const BASE_DATE = 1783353600000; // 2026-07-06T16:00:00.000Z

const generateMockEmotions = (sentiment: number, pol: number, seed: number) => ({
  fear: Math.max(0, 50 - sentiment * 50 + (pseudoRandom(seed) * 20 - 10)),
  anger: Math.max(0, 50 - sentiment * 50 + (pseudoRandom(seed + 1) * 20 - 10)),
  hope: Math.max(0, 50 + sentiment * 50 + (pseudoRandom(seed + 2) * 20 - 10)),
  pride: Math.max(0, 50 + sentiment * 50 + (pseudoRandom(seed + 3) * 20 - 10)),
  fatigue: Math.min(100, pol * 0.8 + (pseudoRandom(seed + 4) * 20)),
});

const personalities = [
  { name: "Javier Milei", cat: "politica", arch: "trickster", s: -0.15, p: 91, a: 42, m: 88 },
  { name: "Lionel Messi", cat: "deportes", arch: "hero", s: 0.92, p: 8, a: 97, m: 85 },
  { name: "Cristina Kirchner", cat: "politica", arch: "villain", s: -0.32, p: 89, a: 38, m: 82 },
  { name: "Mauricio Macri", cat: "politica", arch: "sage", s: -0.1, p: 75, a: 35, m: 50 },
  { name: "Lali Espósito", cat: "espectaculo", arch: "hero", s: 0.45, p: 65, a: 70, m: 85 },
  { name: "Bizarrap", cat: "espectaculo", arch: "trickster", s: 0.8, p: 15, a: 88, m: 75 },
  { name: "Axel Kicillof", cat: "politica", arch: "guardian", s: -0.05, p: 85, a: 45, m: 80 },
  { name: "Victoria Villarruel", cat: "politica", arch: "guardian", s: 0.1, p: 82, a: 48, m: 70 },
  { name: "Tini Stoessel", cat: "espectaculo", arch: "hero", s: 0.5, p: 45, a: 68, m: 72 },
  { name: "Dibu Martínez", cat: "deportes", arch: "trickster", s: 0.85, p: 12, a: 92, m: 90 },
  { name: "Juan Grabois", cat: "politica", arch: "villain", s: -0.4, p: 88, a: 28, m: 75 },
  { name: "Susana Giménez", cat: "espectaculo", arch: "sage", s: 0.2, p: 55, a: 60, m: 30 },
  { name: "Mirtha Legrand", cat: "espectaculo", arch: "sage", s: 0.3, p: 60, a: 65, m: 40 },
  { name: "Sergio Massa", cat: "politica", arch: "trickster", s: -0.25, p: 78, a: 32, m: 65 },
  { name: "Emilia Mernes", cat: "espectaculo", arch: "hero", s: 0.6, p: 25, a: 75, m: 80 },
  { name: "Patricia Bullrich", cat: "politica", arch: "guardian", s: 0.05, p: 80, a: 45, m: 68 },
  { name: "Guillermo Francella", cat: "espectaculo", arch: "sage", s: 0.4, p: 50, a: 72, m: 45 },
  { name: "Ricardo Darín", cat: "espectaculo", arch: "hero", s: 0.75, p: 20, a: 85, m: 50 },
  { name: "María Becerra", cat: "espectaculo", arch: "hero", s: 0.65, p: 30, a: 78, m: 82 },
  { name: "Martín Llaryora", cat: "politica", arch: "guardian", s: 0.15, p: 60, a: 42, m: 50 },
];

export const TOP_20_PERSONALITIES: PersonalityAnalysis[] = personalities.map((p, i) => ({
  id: p.name.toLowerCase().replace(/\s+/g, '-'),
  name: p.name,
  category: p.cat as "politica" | "espectaculo" | "deportes",
  archetype: p.arch as ArchetypeKey,
  archetypeScore: Math.round(70 + pseudoRandom(i + 5) * 25),
  summary: `Análisis heurístico de ${p.name}. Tendencias y métricas basadas en percepciones de la opinión pública.`,
  analyzedAt: new Date(BASE_DATE - i * 3600000).toISOString(),
  metrics: {
    approval: p.a,
    polarization: p.p,
    mobilization: p.m,
    coherence: Math.round(50 + pseudoRandom(i + 6) * 30),
    resonance: Math.round(60 + pseudoRandom(i + 7) * 40),
    trust: Math.round(p.a * 0.8 + pseudoRandom(i + 8) * 10),
  },
  emotions: generateMockEmotions(p.s, p.p, i * 10),
  sentimentOverall: p.s,
  provinceData: MOCK_PROVINCE_SENTIMENTS,
  topNews: [],
  keywords: ["tendencia", "argentina", p.name.split(" ")[0].toLowerCase()],
  trend: p.s > 0.2 ? "rising" : p.s < -0.2 ? "falling" : "stable",
})).sort((a, b) => b.metrics.resonance - a.metrics.resonance); // Ordenados por resonancia/impacto
