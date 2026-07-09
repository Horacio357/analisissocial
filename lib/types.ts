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
  advancedMetrics?: {
    narrativeContagion: { index: number; explanation: string };
    cognitiveDissonance: { gap: number; explanation: string };
    emotionalSynchrony: { score: number; regions: string[]; explanation: string };
    amplifiers: string[];
    hardAgendaCorrelation: string;
    network: {
      allies: { name: string; strength: number; reason: string }[];
      enemies: { name: string; conflictLevel: number; reason: string }[];
    };
    timeline: {
      month: string;
      approval: number;
      polarization: number;
      dissonance: number;
    }[];
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

export const CRISTINA_PROVINCES: Record<string, ProvinceMetric> = {
  ...MOCK_PROVINCE_SENTIMENTS,
  "buenos-aires": { sentiment: 0.45, intensity: 0.9, dominantArchetype: "hero" }, // Fuerte
  "buenos-aires-ciudad": { sentiment: -0.5, intensity: 0.8, dominantArchetype: "villain" }, // Rechazo
  "cordoba": { sentiment: -0.8, intensity: 0.95, dominantArchetype: "villain" }, // Fuerte rechazo
  "mendoza": { sentiment: -0.6, intensity: 0.85, dominantArchetype: "villain" }, // Fuerte rechazo
  "santa-fe": { sentiment: -0.3, intensity: 0.7, dominantArchetype: "villain" },
  "santiago-del-estero": { sentiment: 0.6, intensity: 0.8, dominantArchetype: "hero" }, // Fuerte
  "formosa": { sentiment: 0.5, intensity: 0.7, dominantArchetype: "hero" },
  "chaco": { sentiment: 0.4, intensity: 0.6, dominantArchetype: "guardian" },
  "tucuman": { sentiment: 0.2, intensity: 0.5, dominantArchetype: "guardian" },
  "santa-cruz": { sentiment: 0.5, intensity: 0.9, dominantArchetype: "hero" },
};

export const MILEI_PROVINCES: Record<string, ProvinceMetric> = {
  ...MOCK_PROVINCE_SENTIMENTS,
  "cordoba": { sentiment: 0.6, intensity: 0.9, dominantArchetype: "hero" }, // Fuerte apoyo
  "mendoza": { sentiment: 0.5, intensity: 0.8, dominantArchetype: "hero" }, // Fuerte apoyo
  "buenos-aires-ciudad": { sentiment: 0.3, intensity: 0.7, dominantArchetype: "hero" },
  "buenos-aires": { sentiment: -0.2, intensity: 0.8, dominantArchetype: "trickster" }, // Dividido/Negativo
  "santiago-del-estero": { sentiment: -0.4, intensity: 0.6, dominantArchetype: "villain" },
  "formosa": { sentiment: -0.5, intensity: 0.7, dominantArchetype: "villain" },
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
    archetypeReasoning: "Se presenta como el outsider que viene a romper el sistema, generando adhesión fervorosa y rechazo visceral en partes iguales.",
    narratives: {
      positive: ["El ordenamiento de las cuentas públicas demuestra un plan económico serio.", "Audacia para avanzar en reformas estructurales necesarias."],
      negative: ["Las inconsistencias internas desgastan el relato de la austeridad.", "Inestabilidad en la gestión diaria por falta de consensos políticos."]
    },
    provinceData: MILEI_PROVINCES,
    topNews: [],
    keywords: ["libertad", "ajuste", "motosierra", "dolarización", "reforma"],
    strategicRecommendations: [
      "Focalizar pauta digital en TikTok para re-captar voto joven con foco en baja de inflación.",
      "Moderar vocería en CABA; los niveles de fatiga social sugieren saturación del discurso confrontativo.",
      "Instalar narrativa de 'estabilidad a largo plazo' para contrarrestar la métrica de Miedo actual."
    ],
    trend: "stable",
    advancedMetrics: {
      narrativeContagion: { index: 85, explanation: "Fuerte viralidad orgánica en TikTok y X." },
      cognitiveDissonance: { gap: 65, explanation: "Brecha creciente entre relato macro y microeconomía." },
      emotionalSynchrony: { score: 45, regions: ["CABA", "Córdoba", "Mendoza"], explanation: "Sintonía en el centro, fricción en el sur." },
      amplifiers: ["Influencers digitales", "Medios aliados", "Cámaras empresariales"],
      hardAgendaCorrelation: "Aprobación atada directamente a la inflación y el dólar.",
      network: {
        allies: [
          { name: "P. Bullrich", strength: 80, reason: "Acuerdo de gestión y seguridad" },
          { name: "L. Caputo", strength: 95, reason: "Ejecución del plan económico central" },
          { name: "S. Sturzenegger", strength: 90, reason: "Arquitecto de desregulación" },
          { name: "Sector Financiero", strength: 85, reason: "Apoyo a la baja del riesgo país" },
          { name: "Votantes sub-30", strength: 75, reason: "Núcleo duro original" },
          { name: "M. Macri", strength: 60, reason: "Alianza táctica legislativa inestable" }
        ],
        enemies: [
          { name: "Kirchnerismo", conflictLevel: 100, reason: "Antagonista ideológico absoluto" },
          { name: "Sindicatos", conflictLevel: 95, reason: "Choque por reforma laboral" },
          { name: "Movimientos Sociales", conflictLevel: 90, reason: "Corte de financiamiento" },
          { name: "M. Lousteau", conflictLevel: 85, reason: "Oposición radical interna" },
          { name: "Gobernadores PJ", conflictLevel: 75, reason: "Disputa por coparticipación" },
          { name: "Universidades", conflictLevel: 80, reason: "Conflicto presupuestario" }
        ]
      },
      timeline: [
        { month: "Mes -5", approval: 56, polarization: 75, dissonance: 40 },
        { month: "Mes -4", approval: 54, polarization: 80, dissonance: 45 },
        { month: "Mes -3", approval: 50, polarization: 82, dissonance: 50 },
        { month: "Mes -2", approval: 48, polarization: 85, dissonance: 58 },
        { month: "Mes -1", approval: 45, polarization: 88, dissonance: 60 },
        { month: "Actual", approval: 42, polarization: 91, dissonance: 65 }
      ]
    }
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
    archetypeReasoning: "Héroe indiscutido de la cultura popular contemporánea que unifica a todos los sectores sociodemográficos del país.",
    narratives: {
      positive: ["Símbolo de humildad, perseverancia y éxito argentino en el mundo.", "Unificador emocional por encima de la política tradicional."],
      negative: ["Desconexión con la realidad económica diaria local.", "Presión desmedida sobre su figura como único faro de esperanza nacional."]
    },
    provinceData: Object.fromEntries(
      Object.keys(MOCK_PROVINCE_SENTIMENTS).map(k => [k, { sentiment: 0.85 + Math.random() * 0.14, intensity: 0.6 + Math.random() * 0.35, dominantArchetype: "hero" as ArchetypeKey }])
    ),
    topNews: [],
    keywords: ["campeón", "Mundial", "Inter Miami", "gol", "récord"],
    strategicRecommendations: [
      "Vincular marca personal únicamente a causas de consenso nacional (ej. solidaridad, deporte juvenil).",
      "Evitar posicionamientos ideológicos que rompan el 100% de Aprobación transversal.",
      "Maximizar activaciones de marketing en el interior del país, donde el sentimiento es unánime."
    ],
    trend: "stable",
    advancedMetrics: {
      narrativeContagion: { index: 99, explanation: "Viralización instantánea a nivel global." },
      cognitiveDissonance: { gap: 5, explanation: "Total alineación entre su figura y la percepción popular." },
      emotionalSynchrony: { score: 98, regions: ["Todo el país"], explanation: "Consenso absoluto." },
      amplifiers: ["Prensa mundial", "Redes Sociales Globales", "Sponsors"],
      hardAgendaCorrelation: "Desvinculado de la economía local. Su imagen depende de resultados deportivos.",
      network: {
        allies: [
          { name: "AFA", strength: 95, reason: "Socio institucional principal" },
          { name: "L. Scaloni", strength: 100, reason: "Liderazgo compartido perfecto" },
          { name: "A. Di María", strength: 100, reason: "Socio histórico en el campo" },
          { name: "Hinchada Argentina", strength: 100, reason: "Idolatría absoluta y unánime" },
          { name: "Inter Miami", strength: 90, reason: "Proyecto deportivo actual" },
          { name: "Sponsors Globales", strength: 95, reason: "Alineación comercial total" }
        ],
        enemies: [
          { name: "Prensa amarillista (pasado)", conflictLevel: 10, reason: "Críticas antiguas disueltas" },
          { name: "Lesiones", conflictLevel: 85, reason: "Único obstáculo real activo" }
        ]
      },
      timeline: [
        { month: "Mes -5", approval: 96, polarization: 5, dissonance: 5 },
        { month: "Mes -4", approval: 97, polarization: 4, dissonance: 5 },
        { month: "Mes -3", approval: 97, polarization: 5, dissonance: 6 },
        { month: "Mes -2", approval: 98, polarization: 5, dissonance: 4 },
        { month: "Mes -1", approval: 97, polarization: 6, dissonance: 5 },
        { month: "Actual", approval: 97, polarization: 8, dissonance: 5 }
      ]
    }
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
    archetypeReasoning: "Figura maternal para sus aliados, pero el villano definitivo para sus detractores, generando niveles extremos de polarización.",
    narratives: {
      positive: ["Protección de los derechos laborales y sociales.", "Liderazgo firme ante los poderes concentrados."],
      negative: ["Agotamiento del modelo económico intervencionista.", "Asociación persistente con causas de corrupción y opacidad judicial."]
    },
    provinceData: CRISTINA_PROVINCES,
    topNews: [],
    keywords: ["conurbano", "oposición", "documento", "PJ", "reaparición"],
    strategicRecommendations: [
      "Reforzar el trabajo territorial en PBA para retener el núcleo duro de Movilización.",
      "Evitar apariciones públicas frecuentes para no incrementar la Polarización (actualmente en 89%).",
      "Construir voceros alternativos para llegar al centro del electorado sin fricción."
    ],
    trend: "rising",
    advancedMetrics: {
      narrativeContagion: { index: 75, explanation: "Alta resonancia en nicho duro, dificultad para romper burbuja." },
      cognitiveDissonance: { gap: 40, explanation: "Coherencia en su base, gran rechazo afuera." },
      emotionalSynchrony: { score: 35, regions: ["PBA", "Norte"], explanation: "Fuerte concentración de apoyo en AMBA." },
      amplifiers: ["Militancia orgánica", "Intendentes PBA", "Medios afines"],
      hardAgendaCorrelation: "Aprobación atada al poder adquisitivo histórico y subsidios.",
      network: {
        allies: [
          { name: "La Cámpora", strength: 95, reason: "Estructura militante principal" },
          { name: "A. Kicillof", strength: 85, reason: "Principal gobernador aliado" },
          { name: "Intendentes PBA", strength: 80, reason: "Base territorial conurbano" },
          { name: "Sindicatos Afines", strength: 75, reason: "Resistencia al gobierno actual" },
          { name: "Madres/Abuelas", strength: 90, reason: "Lazo histórico de DDHH" },
          { name: "S. Massa", strength: 65, reason: "Alianza pragmática inestable" }
        ],
        enemies: [
          { name: "J. Milei", conflictLevel: 100, reason: "Antagonista ideológico directo" },
          { name: "Poder Judicial", conflictLevel: 95, reason: "Causas abiertas y condenas" },
          { name: "M. Macri", conflictLevel: 90, reason: "Enemigo histórico del PRO" },
          { name: "P. Bullrich", conflictLevel: 85, reason: "Fricción en seguridad y relato" },
          { name: "Medios Hegemónicos", conflictLevel: 95, reason: "Guerra mediática crónica" },
          { name: "PJ No Kirchnerista", conflictLevel: 70, reason: "Disputa por liderazgo peronista" }
        ]
      },
      timeline: [
        { month: "Mes -5", approval: 35, polarization: 85, dissonance: 45 },
        { month: "Mes -4", approval: 34, polarization: 85, dissonance: 42 },
        { month: "Mes -3", approval: 35, polarization: 88, dissonance: 40 },
        { month: "Mes -2", approval: 36, polarization: 89, dissonance: 40 },
        { month: "Mes -1", approval: 37, polarization: 88, dissonance: 38 },
        { month: "Actual", approval: 38, polarization: 89, dissonance: 40 }
      ]
    }
  },
];
