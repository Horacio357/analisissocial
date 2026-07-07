export type ArchetypeKey = "hero" | "villain" | "sage" | "trickster" | "guardian";

export interface PersonalityAnalysis {
  id: string;
  name: string;
  category: "politica" | "deportes" | "social" | "entretenimiento" | "cultura";
  imageUrl?: string;
  archetype: ArchetypeKey;
  archetypeScore: number; // 0-100 confidence
  summary: string;
  analyzedAt: string; // ISO date
  metrics: {
    approval: number;       // 0-100
    polarization: number;   // 0-100
    mobilization: number;   // 0-100
    coherence: number;      // 0-100
    resonance: number;      // 0-100
    trust: number;          // 0-100
  };
  sentimentOverall: number; // -1 to 1
  provinceData: Record<string, ProvinceMetric>;
  topNews: NewsItem[];
  keywords: string[];
  strategicRecommendations?: string[];
  trend: "rising" | "falling" | "stable";
  emotions?: {
    fear: number;
    anger: number;
    hope: number;
    pride: number;
    fatigue: number;
  };
}

export interface ProvinceMetric {
  sentiment: number; // -1 to 1
  intensity: number; // 0-1 how much discussion
  dominantArchetype?: ArchetypeKey;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: number;
  summary?: string;
}

export interface SocialPulse {
  nationalSentiment: number; // -1 to 1
  trendingTopics: TrendingTopic[];
  alertZones: string[]; // provincias con alta intensidad negativa
  consensusZones: string[]; // provincias con alta positividad
  lastUpdated: string;
}

export interface TrendingTopic {
  keyword: string;
  volume: number;
  sentiment: number;
  provinces: string[];
  category: string;
}

// Mock data para provincias
export const MOCK_PROVINCE_SENTIMENTS: Record<string, ProvinceMetric> = {
  "buenos-aires": { sentiment: -0.2, intensity: 0.9, dominantArchetype: "villain" },
  "buenos-aires-ciudad": { sentiment: 0.1, intensity: 0.95, dominantArchetype: "trickster" },
  "cordoba": { sentiment: 0.3, intensity: 0.7, dominantArchetype: "guardian" },
  "santa-fe": { sentiment: 0.1, intensity: 0.65, dominantArchetype: "sage" },
  "mendoza": { sentiment: 0.4, intensity: 0.55, dominantArchetype: "hero" },
  "tucuman": { sentiment: -0.5, intensity: 0.8, dominantArchetype: "villain" },
  "salta": { sentiment: -0.1, intensity: 0.5, dominantArchetype: "guardian" },
  "jujuy": { sentiment: 0.2, intensity: 0.45, dominantArchetype: "sage" },
  "entre-rios": { sentiment: 0.35, intensity: 0.4, dominantArchetype: "hero" },
  "corrientes": { sentiment: 0.25, intensity: 0.42, dominantArchetype: "hero" },
  "misiones": { sentiment: 0.15, intensity: 0.38, dominantArchetype: "guardian" },
  "chaco": { sentiment: -0.4, intensity: 0.62, dominantArchetype: "villain" },
  "formosa": { sentiment: -0.6, intensity: 0.55, dominantArchetype: "villain" },
  "santiago-del-estero": { sentiment: -0.3, intensity: 0.48, dominantArchetype: "trickster" },
  "la-rioja": { sentiment: 0.1, intensity: 0.3, dominantArchetype: "sage" },
  "catamarca": { sentiment: 0.05, intensity: 0.28, dominantArchetype: "sage" },
  "san-juan": { sentiment: 0.2, intensity: 0.35, dominantArchetype: "guardian" },
  "san-luis": { sentiment: 0.15, intensity: 0.3, dominantArchetype: "guardian" },
  "la-pampa": { sentiment: 0.3, intensity: 0.25, dominantArchetype: "hero" },
  "neuquen": { sentiment: 0.45, intensity: 0.5, dominantArchetype: "hero" },
  "rio-negro": { sentiment: 0.3, intensity: 0.38, dominantArchetype: "guardian" },
  "chubut": { sentiment: 0.1, intensity: 0.32, dominantArchetype: "sage" },
  "santa-cruz": { sentiment: 0.05, intensity: 0.22, dominantArchetype: "trickster" },
  "tierra-del-fuego": { sentiment: 0.4, intensity: 0.28, dominantArchetype: "hero" },
};

export const MOCK_PERSONALITIES: PersonalityAnalysis[] = [
  {
    id: "javier-milei",
    name: "Javier Milei",
    category: "politica",
    archetype: "trickster",
    archetypeScore: 82,
    summary: "Figura altamente polarizante con narrativa disruptiva. Alto en resonancia pero con coherencia percibida variable. Generador de movilización masiva tanto de adhesión como de rechazo.",
    analyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metrics: { approval: 42, polarization: 91, mobilization: 88, coherence: 38, resonance: 94, trust: 31 },
    emotions: { fear: 40, anger: 60, hope: 50, pride: 30, fatigue: 20 },
    sentimentOverall: -0.15,
    provinceData: MOCK_PROVINCE_SENTIMENTS,
    topNews: [],
    keywords: ["libertad", "ajuste", "motosierra", "dolarización", "reforma"],
    trend: "stable",
  },
  {
    id: "lionel-messi",
    name: "Lionel Messi",
    category: "deportes",
    archetype: "hero",
    archetypeScore: 97,
    summary: "Máxima expresión del arquetipo Héroe en la narrativa colectiva argentina. Cohesiona identidad nacional. Único caso con aprobación transversal a todas las provincias y sectores.",
    analyzedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metrics: { approval: 97, polarization: 8, mobilization: 85, coherence: 95, resonance: 99, trust: 96 },
    emotions: { fear: 2, anger: 3, hope: 95, pride: 100, fatigue: 15 },
    sentimentOverall: 0.92,
    provinceData: Object.fromEntries(
      Object.keys(MOCK_PROVINCE_SENTIMENTS).map(k => [k, { sentiment: 0.85 + Math.random() * 0.14, intensity: 0.6 + Math.random() * 0.35, dominantArchetype: "hero" as ArchetypeKey }])
    ),
    topNews: [],
    keywords: ["campeón", "Mundial", "Inter Miami", "gol", "récord"],
    trend: "stable",
  },
  {
    id: "cristina-kirchner",
    name: "Cristina Kirchner",
    category: "politica",
    archetype: "villain",
    archetypeScore: 64,
    summary: "Figura de alta polarización con doble narrativa: héroe para sus bases y villano para la oposición. Alta movilización, baja confianza en el centro del electorado.",
    analyzedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    metrics: { approval: 38, polarization: 89, mobilization: 82, coherence: 72, resonance: 88, trust: 28 },
    emotions: { fear: 45, anger: 55, hope: 40, pride: 35, fatigue: 75 },
    sentimentOverall: -0.32,
    provinceData: MOCK_PROVINCE_SENTIMENTS,
    topNews: [],
    keywords: ["kirchnerismo", "peronismo", "juicio", "condena", "partido"],
    trend: "falling",
  },
];
