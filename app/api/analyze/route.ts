import { NextRequest, NextResponse } from "next/server";
import { MOCK_PERSONALITIES } from "@/lib/types";
import { nameToId, ARCHETYPE_CONFIG } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchArgentineRSS, RSSArticle } from "@/lib/rss";
import { fetchYouTubeComments } from "@/lib/youtube";

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSDATA_API_URL = process.env.NEWSDATA_API_URL || "https://newsdata.io/api/1/latest";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// In-memory cache (se resetea con cada deploy en prod)
const analysisCache = new Map<string, { data: unknown; expiresAt: number }>();

// ─── NewsData ──────────────────────────────────────────────────────────────────
async function fetchPersonalityNews(name: string) {
  // 1. Iniciar búsquedas en paralelo (Híbrido)
  const rssPromise = fetchArgentineRSS(name);
  
  const wikiPromise = fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`)
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);
  
  let newsdataPromise = Promise.resolve([]);
  if (NEWSDATA_API_KEY) {
    const exactParams = new URLSearchParams({ apikey: NEWSDATA_API_KEY, q: `"${name}"`, language: "es", country: "ar", size: "5" });
    const flexParams = new URLSearchParams({ apikey: NEWSDATA_API_KEY, q: name, language: "es", country: "ar", size: "5" });
    
    newsdataPromise = fetch(`${NEWSDATA_API_URL}?${exactParams}`)
      .then(res => res.ok ? res.json() : { results: [] })
      .then(data => {
        if (!data.results || data.results.length < 3) {
          return fetch(`${NEWSDATA_API_URL}?${flexParams}`).then(r => r.ok ? r.json() : { results: [] });
        }
        return data;
      })
      .then(data => data.results || [])
      .catch(() => []);
  }

  // Esperar todos los motores
  const [rssArticles, newsdataArticles, wikiData] = await Promise.all([rssPromise, newsdataPromise, wikiPromise]);

  // Estandarizar formato NewsData
  const formattedNewsData = newsdataArticles.map((item: any) => ({
    title: item.title,
    source_name: item.source_id || "NewsData",
    link: item.link,
    pubDate: item.pubDate,
    description: item.description || ""
  }));

  // Combinar
  const combined = [...rssArticles, ...formattedNewsData];
  
  if (wikiData && wikiData.extract) {
    combined.push({
      title: `Perfil enciclopédico de ${wikiData.title}`,
      source_name: "Wikipedia",
      link: wikiData.content_urls?.desktop?.page || "",
      pubDate: new Date().toISOString(),
      description: wikiData.extract
    });
  }

  // Remover duplicados (por título similar o link exacto)
  const uniqueMap = new Map<string, RSSArticle>();
  combined.forEach(item => {
    // Clave simple para evitar la misma nota
    const key = item.title.slice(0, 30).toLowerCase();
    if (!uniqueMap.has(key) && !uniqueMap.has(item.link)) {
      uniqueMap.set(key, item as RSSArticle);
      uniqueMap.set(item.link, item as RSSArticle); // registrar link
    }
  });

  // Nos quedamos con los 10 mejores y únicos
  const uniqueArticles = Array.from(new Set(Array.from(uniqueMap.values())));
  return uniqueArticles.slice(0, 10);
}

// ─── Heurística de fallback (sin Gemini) ─────────────────────────────────────
function heuristicSentiment(text: string): number {
  const pos = ["logro","éxito","victoria","bien","positivo","avance","recuperación","crecimiento",
    "apoyo","reconocimiento","acuerdo","mejor","progreso","ganó","celebra","excelente","histórico","elogio"];
  const neg = ["escándalo","corrupción","crisis","fracaso","caída","condena","juicio","protesta",
    "conflicto","deuda","inflación","pobreza","desempleo","renuncia","acusa","denuncia","fraude",
    "robo","mal","peor","grave","problema","falla","error","ataque","violencia","crítica","cuestionado"];
  const lower = text.toLowerCase();
  let score = 0;
  pos.forEach(w => { if (lower.includes(w)) score += 0.12; });
  neg.forEach(w => { if (lower.includes(w)) score -= 0.12; });
  return Math.max(-1, Math.min(1, score));
}

function heuristicArchetype(m: { approval:number; polarization:number; mobilization:number; coherence:number; resonance:number; trust:number }) {
  if (m.approval > 70 && m.polarization < 30) return "hero";
  if (m.polarization > 75 && m.mobilization > 70) return m.approval < 45 ? "villain" : "trickster";
  if (m.trust > 70 && m.coherence > 70) return "sage";
  if (m.polarization > 60 && m.trust < 40) return "trickster";
  if (m.coherence > 60 && m.trust > 50) return "guardian";
  return m.resonance > 80 ? (m.polarization > 60 ? "villain" : "hero") : "guardian";
}

function heuristicMetrics(articles: Array<{ title?: string; description?: string }>) {
  if (!articles.length) return { approval:50, polarization:50, mobilization:50, coherence:50, resonance:50, trust:50 };
  const sentiments = articles.map(a => heuristicSentiment(`${a.title||""} ${a.description||""}`));
  const avg = sentiments.reduce((a,b) => a+b, 0) / sentiments.length;
  const variance = sentiments.reduce((acc,s) => acc + (s-avg)**2, 0) / sentiments.length;
  const approval = Math.round(((avg+1)/2)*100);
  const polarization = Math.round(Math.min(100, variance*500+30));
  const mobilization = Math.round(Math.min(100, articles.length*10));
  const coherence = Math.round(100 - polarization*0.6);
  const resonance = Math.round(Math.min(100, articles.length*8+30));
  const trust = Math.round(Math.max(0, approval*0.7 - polarization*0.3+20));
  return { approval, polarization, mobilization, coherence, resonance, trust };
}

// ─── Análisis con Gemini ──────────────────────────────────────────────────────
interface GeminiAnalysisResult {
  summary: string;
  archetype: keyof typeof ARCHETYPE_CONFIG;
  archetypeScore: number;
  archetypeReasoning: string;
  metrics: { approval:number; polarization:number; mobilization:number; coherence:number; resonance:number; trust:number };
  emotions: { fear:number; anger:number; hope:number; pride:number; fatigue:number };
  sentimentOverall: number;
  keywords: string[];
  trend: "rising" | "falling" | "stable";
  narratives: { positive: string[]; negative: string[] };
  aiPowered: true;
}

async function analyzeWithGemini(
  name: string,
  articles: Array<{ title?: string; description?: string; source_name?: string; pubDate?: string; link?: string }>,
  youtubeComments: Array<{ author: string; text: string; likes: number }> = []
): Promise<GeminiAnalysisResult | null> {
  if (!GEMINI_API_KEY) return null;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const articlesText = articles
    .slice(0, 5)
    .map((a, i) => `[${i+1}] ${a.title || "Sin título"} — ${a.source_name || "?"}\n${a.description?.slice(0,150)||""}`)
    .join("\n\n");

  const prompt = `Sos el Analista Principal de Inteligencia Sociopolítica más prestigioso de Argentina. Tu tarea es elaborar un perfil psicológico y estratégico de "${name}".

INSTRUCCIONES CLAVES:
1. IGNORÁ noticias repetidas o ruido irrelevante. Enfocate solo en las señales de fondo.
2. Usá tu base de datos interna para construir el perfil psicológico y de poder de esta persona.
3. Sé sintético y contundente, estilo consultoría de élite.

NOTICIAS RECIENTES (Úsalas solo como termómetro del presente mediático):
${articlesText || "(Sin noticias recientes — apoyate 100% en tu conocimiento histórico y político profundo sobre esta figura)"}

COMENTARIOS ORGÁNICOS (YouTube - Voz de la Calle):
${youtubeComments.length > 0 ? youtubeComments.map((c, i) => `[${i+1}] "${c.text}" (👍 ${c.likes} likes)`).join("\n") : "(Sin comentarios recientes)"}

REGLA DE DISONANCIA: Compará el tono de las noticias (periodismo) con el tono de los comentarios orgánicos (gente real). Si la noticia habla de un 'éxito' pero los comentarios muestran furia, aumentá radicalmente la 'cognitiveDissonance' (brecha relato vs realidad) en el apartado advancedMetrics.

REGLA DE POLARIZACIÓN: Si la métrica de 'polarization' que calcules es menor a 40 (baja polarización), incluí obligatoriamente en las 'strategicRecommendations' al menos un tip audaz sobre cómo polarizar para generar mayor tracción y salir de la apatía.

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "summary": "Resumen narrativo de 2-3 oraciones que capture la esencia actual de la figura en la opinión pública argentina. Sé específico, cita hechos reales.",
  "archetype": "uno de: hero | villain | sage | trickster | guardian",
  "archetypeScore": <número 0-100 indicando confianza en el arquetipo>,
  "archetypeReasoning": "Explicación de 1-2 oraciones del por qué este arquetipo. Qué narrativa colectiva lo sostiene.",
  "metrics": {
    "approval": <0-100, aprobación general en la narrativa mediática>,
    "polarization": <0-100, cuánto divide a la sociedad>,
    "mobilization": <0-100, capacidad de movilizar/generar acción>,
    "coherence": <0-100, consistencia percibida entre discurso y actos>,
    "resonance": <0-100, impacto real en la conversación pública>,
    "trust": <0-100, credibilidad percibida>
  },
  "emotions": {
    "fear": <0-100, nivel de miedo/incertidumbre/inseguridad generado>,
    "anger": <0-100, nivel de descontento/bronca social>,
    "hope": <0-100, nivel de esperanza/felicidad/alivio>,
    "pride": <0-100, nivel de orgullo nacional o sectorial>,
    "fatigue": <0-100, nivel de fatiga social o burnout sobre la figura/tema>
  },
  "sentimentOverall": <número entre -1.0 y 1.0, siendo -1 muy negativo y 1 muy positivo>,
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "trend": "rising | falling | stable",
  "narratives": {
    "positive": ["narrativa favorable 1", "narrativa favorable 2"],
    "negative": ["narrativa crítica 1", "narrativa crítica 2"]
  },
  "strategicRecommendations": [
    "Recomendación accionable 1",
    "Recomendación accionable 2",
    "Recomendación accionable 3"
  ],
  "advancedMetrics": {
    "narrativeContagion": { "index": <0-100, velocidad de viralización>, "explanation": "Breve explicación de cómo contagia" },
    "cognitiveDissonance": { "gap": <0-100, brecha entre relato y sentimiento callejero>, "explanation": "Qué percibe la gente por debajo del relato" },
    "emotionalSynchrony": { "score": <0-100, homogeneidad federal>, "regions": ["NOA", "Centro", etc], "explanation": "Dónde resuena o dónde choca" },
    "amplifiers": ["Nodo/Periodista/Troll 1", "Medio 2", "Sector 3"],
    "hardAgendaCorrelation": "Breve análisis de cómo su imagen se ata a eventos económicos duros (dólar, inflación, desocupación)",
    "network": {
      "allies": [
        { "name": "Aliado 1 (Nombre Real)", "strength": <0-100>, "reason": "Por qué son aliados hoy" },
        { "name": "Aliado 2", "strength": <0-100>, "reason": "..." },
        { "name": "Aliado 3", "strength": <0-100>, "reason": "..." },
        { "name": "Aliado 4 (mínimo 4)", "strength": <0-100>, "reason": "..." }
      ],
      "enemies": [
        { "name": "Enemigo 1 (Nombre Real)", "conflictLevel": <0-100>, "reason": "Motivo del conflicto actual" },
        { "name": "Enemigo 2", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Enemigo 3", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Enemigo 4 (mínimo 4)", "conflictLevel": <0-100>, "reason": "..." }
      ]
    },
    "timeline": [
      { "month": "Hace 5 meses", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> },
      { "month": "Hace 4 meses", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> },
      { "month": "Hace 3 meses", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> },
      { "month": "Hace 2 meses", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> },
      { "month": "Mes pasado", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> },
      { "month": "Actual", "approval": <0-100>, "polarization": <0-100>, "dissonance": <0-100> }
    ]
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");
    const parsed = JSON.parse(jsonMatch[0]);
    return { ...parsed, aiPowered: true };
  } catch (err) {
    console.error("Gemini error, attempting Groq fallback:", err);
    try {
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) throw new Error("No Groq API Key available for fallback");
      
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });

      if (!groqRes.ok) {
         throw new Error(`Groq API error: ${groqRes.statusText}`);
      }

      const groqData = await groqRes.json();
      const text = groqData.choices[0].message.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Groq response");
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, aiPowered: true, fromFallback: true };
    } catch (groqErr) {
      console.error("Groq fallback error:", groqErr);
      return null;
    }
  }
}

// ─── Narrativas emergentes (trending) ────────────────────────────────────────
async function fetchEmergingNarratives(): Promise<Array<{keyword:string; volume:number; trend:string; sentiment:number; sample:string}>> {
  if (!NEWSDATA_API_KEY) return [];

  const topics = ["economía argentina", "política argentina", "inflación argentina", "elecciones argentina", "derechos argentina"];

  try {
    const results = await Promise.all(
      topics.slice(0, 3).map(async (topic) => {
        const params = new URLSearchParams({
          apikey: NEWSDATA_API_KEY!,
          q: topic,
          language: "es",
          country: "ar",
          size: "5",
        });
        const res = await fetch(`${NEWSDATA_API_URL}?${params}`);
        if (!res.ok) return null;
        const data = await res.json();
        const articles = data.results || [];
        const sentiment = articles.reduce((acc: number, a: { title?: string }) =>
          acc + heuristicSentiment(a.title||""), 0) / Math.max(articles.length, 1);
        return {
          keyword: topic.replace(" argentina",""),
          volume: articles.length * 10 + Math.floor(Math.random()*40),
          trend: sentiment > 0 ? "↑ creciendo" : "↓ tensión",
          sentiment,
          sample: articles[0]?.title || "",
        };
      })
    );
    return results.filter(Boolean) as Array<{keyword:string; volume:number; trend:string; sentiment:number; sample:string}>;
  } catch { return []; }
}

// ─── Endpoint principal GET ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const forceRefresh = searchParams.get("refresh") === "true";

  // Endpoint especial: narrativas emergentes
  if (searchParams.get("mode") === "emerging") {
    const data = await fetchEmergingNarratives();
    return NextResponse.json({ narratives: data, updatedAt: new Date().toISOString() });
  }

  if (!name) {
    return NextResponse.json({ error: "Parámetro 'name' requerido" }, { status: 400 });
  }

  const id = nameToId(name);

  // 1. Caché (salvo que pidan refresh explícito)
  if (!forceRefresh) {
    const cached = analysisCache.get(id);
    if (cached && Date.now() < cached.expiresAt) {
      const dataObj = typeof cached.data === "string" ? JSON.parse(cached.data) : cached.data;
      return NextResponse.json({ ...dataObj, fromCache: true });
    }
  }

  // 2. [REMOVIDO] No usar MOCK para asegurar que siempre haya info espectacular y en tiempo real.

  // 3. Noticias reales y Comentarios de YouTube (Motor Triple)
  const [articles, youtubeComments] = await Promise.all([
    fetchPersonalityNews(name),
    fetchYouTubeComments(name)
  ]);

  // 4. Análisis con Gemini (si hay API key) o heurístico
  const geminiResult = await analyzeWithGemini(name, articles, youtubeComments);

  const { MOCK_PROVINCE_SENTIMENTS } = await import("@/lib/types");

  let analysis;

  if (geminiResult) {
    // ── Análisis potenciado por Gemini ──
    const provinceData = Object.fromEntries(
      Object.keys(MOCK_PROVINCE_SENTIMENTS).map(k => [
        k,
        {
          sentiment: Math.max(-1, Math.min(1, geminiResult.sentimentOverall + (Math.random()-0.5)*0.35)),
          intensity: 0.3 + Math.random()*0.5,
          dominantArchetype: geminiResult.archetype,
        },
      ])
    );

    const topNews = articles.slice(0,5).map((a: { title?: string; source_name?: string; link?: string; pubDate?: string }) => ({
      title: a.title || "Sin título",
      source: a.source_name || "Desconocido",
      url: a.link || "#",
      publishedAt: a.pubDate || new Date().toISOString(),
      sentiment: heuristicSentiment(a.title || ""),
    }));

    analysis = {
      id,
      name,
      category: "politica" as const,
      archetype: geminiResult.archetype,
      archetypeScore: geminiResult.archetypeScore,
      archetypeReasoning: geminiResult.archetypeReasoning,
      summary: geminiResult.summary,
      analyzedAt: new Date().toISOString(),
      metrics: geminiResult.metrics,
      emotions: geminiResult.emotions,
      sentimentOverall: geminiResult.sentimentOverall,
      provinceData,
      topNews,
      keywords: geminiResult.keywords,
      strategicRecommendations: geminiResult.strategicRecommendations || [],
      trend: geminiResult.trend,
      narratives: geminiResult.narratives,
      advancedMetrics: geminiResult.advancedMetrics,
      aiPowered: true,
    };
  } else {
    // ── Fallback heurístico inteligente ──
    const topNews = articles.slice(0,5).map((a: { title?: string; source_name?: string; link?: string; pubDate?: string }) => ({
      title: a.title || "Sin título",
      source: a.source_name || "Desconocido",
      url: a.link || "#",
      publishedAt: a.pubDate || new Date().toISOString(),
      sentiment: heuristicSentiment(a.title || ""),
    }));

    const mock = MOCK_PERSONALITIES.find(p => p.id === id || p.name.toLowerCase() === name.toLowerCase());
    
    let metrics, archetype, sentimentOverall;
    
    if (mock) {
      metrics = mock.metrics;
      archetype = mock.archetype;
      sentimentOverall = mock.sentimentOverall;
    } else if (articles.length > 2) {
      metrics = heuristicMetrics(articles);
      archetype = heuristicArchetype(metrics);
      sentimentOverall = (metrics.approval - 50) / 50;
    } else {
      // Generador dinámico basado en hash del nombre para evitar que todos sean "Guardián/Neutro" cuando la API falla
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = Math.abs((hash << 5) - hash + name.charCodeAt(i) | 0);
      const archetypes = ["hero", "villain", "trickster", "sage", "guardian"] as const;
      archetype = archetypes[hash % 5];
      const norm = (hash % 100) / 100;
      sentimentOverall = (norm * 1.6) - 0.8;
      metrics = {
        approval: Math.round((sentimentOverall + 1) / 2 * 100),
        polarization: 40 + (hash % 60),
        mobilization: 30 + (hash % 70),
        coherence: 30 + ((hash * 2) % 70),
        resonance: 40 + ((hash * 3) % 60),
        trust: 20 + ((hash * 4) % 80)
      };
    }

    const provinceData = Object.fromEntries(
      Object.keys(MOCK_PROVINCE_SENTIMENTS).map(k => [
        k,
        {
          sentiment: Math.max(-1, Math.min(1, sentimentOverall + (Math.random()-0.5)*0.4)),
          intensity: 0.3 + Math.random()*0.5,
          dominantArchetype: archetype,
        },
      ])
    );

    const allText = articles.map((a: { title?: string }) => a.title||"").join(" ").toLowerCase();
    const stopWords = new Set(["el","la","de","en","y","a","que","es","se","del","un","una","con","por","para","al","lo","su","le","los","las","su","sus"]);
    const words = allText.split(/\s+/).filter((w: string) => w.length > 4 && !stopWords.has(w));
    const freq = words.reduce((acc: Record<string,number>, w: string) => { acc[w] = (acc[w]||0)+1; return acc; }, {} as Record<string, number>);
    const keywords = Object.entries(freq).sort((a,b) => (b[1] as number)-(a[1] as number)).slice(0,8).map(([k]) => k);

    analysis = {
      id,
      name,
      category: "politica" as const,
      archetype,
      archetypeScore: Math.round(60 + Math.random()*25),
      summary: articles.find((a: any) => a.source_name === "Wikipedia")?.description?.slice(0, 300) + "..." || (articles.length > 0
        ? `Análisis basado en ${articles.length} artículos recientes. ${ARCHETYPE_CONFIG[archetype].description}`
        : `No se encontraron noticias recientes sobre ${name}. Mostrando análisis estimado basado en comportamiento sociológico simulado.`),
      analyzedAt: new Date().toISOString(),
      metrics,
      emotions: {
        fear: Math.max(0, 50 - sentimentOverall * 50 + (Math.random() * 20 - 10)),
        anger: Math.max(0, 50 - sentimentOverall * 50 + (Math.random() * 20 - 10)),
        hope: Math.max(0, 50 + sentimentOverall * 50 + (Math.random() * 20 - 10)),
        pride: Math.max(0, 50 + sentimentOverall * 50 + (Math.random() * 20 - 10)),
        fatigue: Math.min(100, metrics.polarization * 0.8 + (Math.random() * 20)),
      },
      sentimentOverall,
      provinceData,
      topNews,
      keywords: keywords.length > 0 ? keywords : [name.split(" ")[0].toLowerCase(), "política"],
      strategicRecommendations: [
        "Monitorear la evolución de la imagen en las próximas semanas.",
        "Cruzar datos de medios con métricas de redes sociales."
      ],
      trend: "stable" as const,
      archetypeReasoning: "Arquetipo asignado algorítmicamente en base a las métricas superficiales de aprobación y polarización detectadas en la muestra de noticias.",
      narratives: {
        positive: ["Las menciones en tono neutral a positivo sugieren cierto margen de tolerancia social."],
        negative: ["La polarización inherente a la figura genera fricción constante en el ecosistema mediático."]
      },
      advancedMetrics: {
        narrativeContagion: { index: metrics.resonance, explanation: "Estimación heurística de viralidad." },
        cognitiveDissonance: { gap: 30, explanation: "Estimación heurística sin IA." },
        emotionalSynchrony: { score: 50, regions: ["Todo el país"], explanation: "Estimación." },
        amplifiers: ["Redes Sociales", "Medios Locales"],
        hardAgendaCorrelation: "Estimación heurística por falta de IA.",
        network: {
          allies: [
            { name: "Aliado 1", score: 85, reason: "Afinidad política", type: "ally" },
            { name: "Aliado 2", score: 70, reason: "Apoyo discursivo", type: "ally" }
          ],
          enemies: [
            { name: "Adversario 1", score: 90, reason: "Polarización directa", type: "enemy" },
            { name: "Adversario 2", score: 75, reason: "Competencia electoral", type: "enemy" }
          ]
        },
        timeline: [
          { month: "Mes -5", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 },
          { month: "Mes -4", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 },
          { month: "Mes -3", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 },
          { month: "Mes -2", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 },
          { month: "Mes -1", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 },
          { month: "Actual", approval: metrics.approval, polarization: metrics.polarization, dissonance: 30 }
        ]
      },
      aiPowered: false,
    };
  }

  analysisCache.set(id, { data: analysis, expiresAt: Date.now() + 30*24*60*60*1000 });
  return NextResponse.json(analysis);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (name) analysisCache.delete(nameToId(name));
  return NextResponse.json({ success: true });
}
