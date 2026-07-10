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
  
  const wikiPromise = fetch(`https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(name)}&limit=1&format=json`)
    .then(res => res.ok ? res.json() : null)
    .then(searchData => {
      if (searchData && searchData[1] && searchData[1].length > 0) {
        const realTitle = searchData[1][0];
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normName = normalize(name);
        const normTitle = normalize(realTitle);
        const nameParts = normName.split(" ").filter(w => w.length > 2);
        const isPlausible = nameParts.length > 0 ? nameParts.every(part => normTitle.includes(part)) : normTitle.includes(normName);
        
        if (isPlausible) {
          return fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(realTitle)}`)
            .then(res => res.ok ? res.json() : null);
        }
      }
      return null;
    })
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
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const pos = [
    "logro", "exito", "victoria", "bien", "positivo", "avance", "recuperacion", "crecimiento",
    "apoyo", "reconocimiento", "acuerdo", "mejor", "progreso", "gano", "celebra", "excelente", 
    "historico", "elogio", "record", "superavit", "sube", "alza", "beneficio", "inversion", 
    "reactivacion", "calma", "alivio", "tregua", "optimista", "repunte", "mejora", "supera",
    "crece", "fortalece", "respaldo", "inaugura", "obras", "descuento",
    "estabilidad", "controlado", "inversion", "inversiones", "desarrollo", "empleo", "pyme",
    "acuerdan", "apoya", "luz verde", "satisfecho", "consenso", "baja el dolar", "baja del dolar",
    "baja la inflacion", "caida de la inflacion", "desaceleracion"
  ];

  const neg = [
    "escandalo", "corrupcion", "crisis", "fracaso", "caida", "condena", "juicio", "protesta",
    "conflicto", "deuda", "inflacion", "pobreza", "desempleo", "renuncia", "acusa", "denuncia", 
    "fraude", "robo", "mal", "peor", "grave", "problema", "falla", "error", "ataque", "violencia", 
    "critica", "cuestionado", "cepo", "tension", "ajuste", "deficit", "freno", "devaluacion", 
    "despido", "despidos", "desplome", "derrumbe", "marcha", "paro", "huelga", 
    "reclamo", "descontento", "baja", "tarifazo", "recorte", "licuacion", "recortes", "licua",
    "tensiones", "polemica", "polemico", "denunciado", "imputado", "allanamiento", "delito",
    "inseguridad", "delincuencia", "crimen", "asesinato", "robo", "asalto", "drogas", "narco",
    "narcotrafico", "pobre", "indigencia", "hambre", "escasez", "falta", "quiebra", "suspension",
    "recesion", "cae", "cayo", "pierde", "perdio", "perjudica", "dano", "alerta", "preocupacion",
    "preocupante", "amenaza", "riesgo", "riesgoso", "dificil", "complicado", "sancion"
  ];

  let score = 0;
  
  pos.forEach(w => {
    if (clean.includes(w)) {
      score += 0.20;
    }
  });

  neg.forEach(w => {
    if (clean.includes(w)) {
      score -= 0.20;
    }
  });

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
    .filter(a => a.source_name !== "Wikipedia")
    .slice(0, 8)
    .map((a, i) => `[${i+1}] ${a.title || "Sin título"} — ${a.source_name || "?"}
${a.description?.slice(0,200)||""}`)
    .join("\n\n");

  const wikiText = articles.find(a => a.source_name === "Wikipedia");

  // Auto-detect category from name & articles
  const allText = `${name} ${articlesText}`.toLowerCase();
  
  // ─── Detección de Temas Nacionales ──────────────────────────────────────────
  const KNOWN_TOPICS: Record<string, { emoji: string; description: string; archetype: string }> = {
    "seguridad": { emoji: "🔒", description: "percepción de inseguridad, delito y fuerzas de seguridad en Argentina", archetype: "villain" },
    "salud": { emoji: "🏥", description: "acceso al sistema de salud, calidad hospitalaria, medicamentos y cobertura médica en Argentina", archetype: "guardian" },
    "nutrición": { emoji: "🥗", description: "hambre, asistencia alimentaria, comedores comunitarios y calidad nutricional en Argentina", archetype: "villain" },
    "educación": { emoji: "📚", description: "calidad educativa, paros docentes, infraestructura escolar y acceso educativo en Argentina", archetype: "guardian" },
    "economía": { emoji: "💰", description: "inflación, salarios, empleo, dólar y poder adquisitivo en Argentina", archetype: "villain" },
    "medio ambiente": { emoji: "🌍", description: "contaminación, cambio climático, minería y recursos naturales en Argentina", archetype: "guardian" },
    "energía": { emoji: "⚡", description: "cortes de luz, tarifas eléctricas, subsidios y crisis energética en Argentina", archetype: "villain" },
    "vivienda": { emoji: "🏘️", description: "acceso a la tierra, alquileres, déficit habitacional y planes de vivienda en Argentina", archetype: "villain" },
    "empleo": { emoji: "💼", description: "desempleo, trabajo informal, precariedad laboral y oportunidades en Argentina", archetype: "villain" },
    "corrupción": { emoji: "⚖️", description: "corrupción gubernamental, transparencia institucional y confianza en el Estado en Argentina", archetype: "villain" },
    "narcotráfico": { emoji: "🚨", description: "narcotráfico, crimen organizado y narcocriminalidad en Argentina", archetype: "villain" },
    "pobreza": { emoji: "📉", description: "niveles de pobreza, indigencia, asistencia social y desigualdad en Argentina", archetype: "villain" },
    "inflación": { emoji: "📈", description: "inflación, aumento de precios, impacto en el consumo y poder adquisitivo en Argentina", archetype: "villain" },
    "drogas": { emoji: "💊", description: "consumo de sustancias, problemática de adicciones y políticas de salud mental en Argentina", archetype: "villain" },
  };
  
  const topicKey = Object.keys(KNOWN_TOPICS).find(k => name.toLowerCase().includes(k));
  const knownTopic = topicKey ? KNOWN_TOPICS[topicKey] : null;
  
  const isInfluencer = !knownTopic && /streamer|youtuber|influencer|twitch|streaming|gamer|content|tiktok|instagram|seguidor|suscriptor|coscu|mazza|olga|luquitas|martita|fort|gastón|papu/.test(allText);
  const isSport = /futbol|tenis|basquet|deporte|atleta|nba|liga|cancha|gol|partido|jugador|entrenador|dt/.test(allText);
  const isArtist = /cantante|actor|actriz|músico|banda|album|película|teatro|arte|cultura/.test(allText);
  const category = knownTopic ? "tema nacional" : (isInfluencer ? "influencer/streamer digital" : isSport ? "figura del deporte" : isArtist ? "figura del entretenimiento y la cultura" : "figura política");
  
  const sectorInstructions = isInfluencer ? `
CONTEXTO DE SECTOR (Influencer/Streamer):
- Esta es una figura digital. Sus métricas clave son: alcance real en YouTube/Twitch/TikTok, engagement auténtico, capacidad de conversión publicitaria, y relevancia en la cultura pop juvenil argentina.
- "Aprobación" = nivel de fanatismo y lealtad de su comunidad. "Polarización" = cuántos lo odian vs. lo aman fuera de su base. "Mobilización" = capacidad de mover a su audiencia a hacer algo concreto (comprar, votar, asistir). "Confianza" = credibilidad como prescriptor de marca o causa.
- Las narrativas deben hablar de su contenido, sus polémicas en redes, su estilo, sus colaboraciones y rivalidades. Ignorar completamente el marco político.
- Las Recomendaciones Estratégicas deben estar orientadas a: marcas que quieran contratarlo, productoras que quieran asociarse, o el propio influencer para crecer.
` : isSport ? `
CONTEXTO DE SECTOR (Deporte):
- Esta es una figura deportiva. Sus métricas clave son: rendimiento actual vs. histórico, impacto en la selección o club, imagen pública fuera del campo y valor de marca.
- Enfocate en el estado de forma actual, su impacto en la camiseta argentina si aplica, y sus contratos/acuerdos comerciales.
- Las Recomendaciones Estratégicas deben estar orientadas a marcas, federaciones o el propio atleta.
` : isArtist ? `
CONTEXTO DE SECTOR (Entretenimiento):
- Esta es una figura del mundo del espectáculo. Sus métricas clave son: popularidad en medios, escándalos, relevancia cultural y capacidad de generar audiencias.
- Hablar de su trayectoria, proyectos actuales, rating de sus trabajos y su imagen en las redes.
` : `
CONTEXTO DE SECTOR (Política):
- Esta es una figura política. Analizá su posicionamiento ideológico, su capital electoral, sus alianzas y enemigos dentro del sistema de poder, y cómo impactan en él los eventos económicos duros (dólar, inflación, desempleo).
`;

  // ─── Prompt de Tema Nacional (si aplica) ─────────────────────────────────────
  if (knownTopic) {
    const topicPrompt = `Sos el analista de percepción social más riguroso y honesto de Argentina. Tu misión es hacer un diagnóstico REAL de cómo perciben los argentinos el tema "${name}" en el año 2025-2026.

DESCRIPCIÓN DEL TEMA: ${knownTopic.description}

REGLA ABSOLUTA: Este análisis NO es sobre una persona. Es sobre cómo siente y percibe el ciudadano argentino promedio este tema en su vida cotidiana. Usá datos, encuestas, hechos y noticias reales.

REGLA DE PROFUNDIDAD: El campo "summary" debe tener MÍNIMO 5 oraciones densas. Mencioná estadísticas, porcentajes reales, provincias más afectadas, y cómo cambió la percepción en el último año.

REGLA DE HONESTIDAD: Decí la verdad dura. Si el 60% de los argentinos no se sienten seguros, decílo. Si la situación mejoró, reconocelo con datos.

FUENTES DISPONIBLES:
${articlesText || "(Sin noticias recientes — apoyate en tu conocimiento actualizado sobre el tema)"}

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "summary": "MÍNIMO 5 oraciones. Diagnóstico real de cómo perciben los argentinos '${name}'. Con estadísticas, provincias afectadas, evolución reciente y causas concretas.",
  "archetype": "${knownTopic.archetype}",
  "archetypeScore": <0-100 nivel de confianza>,
  "archetypeReasoning": "Por qué este tema tiene este arquetipo en la percepción colectiva argentina. 2-3 oraciones con datos.",
  "category": "tema nacional",
  "metrics": {
    "approval": <0-100, qué tan bien percibe la ciudadanía la situación de este tema>,
    "polarization": <0-100, cuánto divide políticamente a la sociedad>,
    "mobilization": <0-100, qué tanta acción ciudadana genera>,
    "coherence": <0-100, qué tan coherente es el relato oficial con la realidad vivida>,
    "resonance": <0-100, qué tan presente está en la agenda mediática y social>,
    "trust": <0-100, qué tanta confianza tienen los ciudadanos en las instituciones para resolver este tema>
  },
  "emotions": {
    "fear": <0-100>,
    "anger": <0-100>,
    "hope": <0-100>,
    "pride": <0-100>,
    "fatigue": <0-100>
  },
  "sentimentOverall": <número entre -1.0 y 1.0, -1 = crisis total, 1 = muy bien resuelto>,
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "trend": "rising | falling | stable",
  "narratives": {
    "positive": ["Aspecto positivo o mejora real con dato concreto 1", "Aspecto positivo 2"],
    "negative": ["Aspecto negativo o crítica real con dato concreto 1", "Aspecto negativo 2"]
  },
  "strategicRecommendations": [
    "Recomendación de política pública o acción ciudadana concreta 1",
    "Recomendación 2 — qué debería cambiar o hacerse para mejorar esta percepción",
    "Recomendación 3"
  ],
  "advancedMetrics": {
    "narrativeContagion": { "index": <0-100>, "explanation": "Cómo se viraliza la angustia/esperanza sobre este tema" },
    "cognitiveDissonance": { "gap": <0-100>, "explanation": "Brecha entre lo que dice el gobierno y lo que vive el ciudadano" },
    "emotionalSynchrony": { "score": <0-100>, "regions": ["NOA", "Patagonia"], "explanation": "Dónde se siente más y dónde menos" },
    "amplifiers": ["Medio/sector que amplifica el debate 1", "Amplificador 2", "Amplificador 3"],
    "hardAgendaCorrelation": "Cómo este tema se mueve con eventos económicos o políticos duros",
    "network": {
      "allies": [
        { "name": "Institución/Organización aliada en resolver este tema 1", "strength": <0-100>, "reason": "Por qué impulsan la solución" },
        { "name": "Aliado 2", "strength": <0-100>, "reason": "..." },
        { "name": "Aliado 3", "strength": <0-100>, "reason": "..." },
        { "name": "Aliado 4", "strength": <0-100>, "reason": "..." }
      ],
      "enemies": [
        { "name": "Obstáculo/actor que agrava el problema 1", "conflictLevel": <0-100>, "reason": "Por qué agrava la situación" },
        { "name": "Obstáculo 2", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Obstáculo 3", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Obstáculo 4", "conflictLevel": <0-100>, "reason": "..." }
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
    const prompt = topicPrompt;
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Gemini topic response");
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, aiPowered: true };
    } catch (topicErr) {
      console.error("Gemini topic error:", topicErr);
      return null;
    }
  }

  const prompt = `Sos el analista de inteligencia pública más brutal y honesto de Argentina. No sos un bot genérico. Tu trabajo es decir la VERDAD sin filtros, con el estilo de un consultor de élite que cobra honorarios de 6 cifras. Analizá a "${name}", una ${category}.

${sectorInstructions}

REGLA DE ORO: PROHIBIDO dar respuestas genéricas, tibias o vagas. Cada oración del análisis debe contener información específica y verificable sobre "${name}". Si decís algo, citá el hecho concreto que lo respalda.

REGLA DE PROFUNDIDAD: El campo "summary" debe tener MÍNIMO 5 oraciones sólidas y densas en información real. No des un resumen de 2 líneas. Es el corazón del análisis y la primera impresión.

REGLA DE HONESTIDAD BRUTAL: Si la figura tiene puntos débiles gravísimos, decílos con nombre y apellido. Si tiene fortalezas reales, reconocelas sin adulación. El cliente paga por la verdad, no por halagos.

REGLA DE DISONANCIA: Compará el relato mediático con la percepción real de la gente. Si hay una brecha enorme entre lo que dice la prensa y lo que siente la audiencia, reflejalo agresivamente en 'cognitiveDissonance'.

REGLA DE POLARIZACIÓN: Si la métrica de 'polarization' es menor a 40, incluí en las 'strategicRecommendations' cómo activar esa apatía.

FUENTES DE DATOS DISPONIBLES:
${wikiText ? `📖 PERFIL ENCICLOPÉDICO: "${wikiText.description}"` : ""}

📰 NOTICIAS Y CONTEXTO RECIENTE:
${articlesText || "(Sin noticias recientes — apoyate 100% en tu conocimiento profundo sobre esta figura)"}

💬 COMENTARIOS ORGÁNICOS DE YOUTUBE (Voz auténtica de la audiencia):
${youtubeComments.length > 0 ? youtubeComments.map((c, i) => `[${i+1}] "${c.text}" (👍 ${c.likes} likes)`).join("\n") : "(Sin comentarios recientes)"}

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "summary": "MÍNIMO 5 oraciones. Perfil psicológico y de poder agresivo. Específico, con hechos reales. Sin frases genéricas.",
  "archetype": "uno de: hero | villain | sage | trickster | guardian",
  "archetypeScore": <número 0-100 indicando confianza>,
  "archetypeReasoning": "2-3 oraciones específicas sobre por qué este arquetipo. Qué narrativa colectiva lo sostiene y qué hecho concreto lo demuestra.",
  "category": "${category}",
  "metrics": {
    "approval": <0-100>,
    "polarization": <0-100>,
    "mobilization": <0-100>,
    "coherence": <0-100>,
    "resonance": <0-100>,
    "trust": <0-100>
  },
  "emotions": {
    "fear": <0-100>,
    "anger": <0-100>,
    "hope": <0-100>,
    "pride": <0-100>,
    "fatigue": <0-100>
  },
  "sentimentOverall": <número entre -1.0 y 1.0>,
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "trend": "rising | falling | stable",
  "narratives": {
    "positive": ["narrativa favorable específica 1 con hecho concreto", "narrativa favorable específica 2"],
    "negative": ["narrativa crítica específica 1 con hecho concreto", "narrativa crítica específica 2"]
  },
  "strategicRecommendations": [
    "Recomendación accionable 1 — específica y audaz, adaptada al sector",
    "Recomendación accionable 2 — que un consultor real daría, no genérica",
    "Recomendación accionable 3 — basada en los puntos débiles del oponente o del mercado"
  ],
  "advancedMetrics": {
    "narrativeContagion": { "index": <0-100>, "explanation": "Explicación específica de cómo contagia su mensaje" },
    "cognitiveDissonance": { "gap": <0-100>, "explanation": "Qué percibe la gente vs. qué dice el relato oficial" },
    "emotionalSynchrony": { "score": <0-100>, "regions": ["NOA", "Centro"], "explanation": "Dónde resuena y dónde no" },
    "amplifiers": ["Nombre real de canal/periodista/nodo 1", "Nombre real 2", "Nombre real 3"],
    "hardAgendaCorrelation": "Cómo su imagen se mueve cuando hay eventos de impacto duro",
    "network": {
      "allies": [
        { "name": "Nombre Real de Aliado 1", "strength": <0-100>, "reason": "Por qué son aliados hoy" },
        { "name": "Nombre Real de Aliado 2", "strength": <0-100>, "reason": "..." },
        { "name": "Nombre Real de Aliado 3", "strength": <0-100>, "reason": "..." },
        { "name": "Nombre Real de Aliado 4", "strength": <0-100>, "reason": "..." }
      ],
      "enemies": [
        { "name": "Nombre Real de Adversario 1", "conflictLevel": <0-100>, "reason": "Motivo específico del conflicto" },
        { "name": "Nombre Real de Adversario 2", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Nombre Real de Adversario 3", "conflictLevel": <0-100>, "reason": "..." },
        { "name": "Nombre Real de Adversario 4", "conflictLevel": <0-100>, "reason": "..." }
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
          model: "llama-3.3-70b-versatile",
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

  // ─── Detección de Categoría / Tema para el fallback y objeto de análisis ───
  const articlesText = articles
    .filter(a => a.source_name !== "Wikipedia")
    .slice(0, 8)
    .map((a, i) => `${a.title || ""} ${a.description || ""}`)
    .join(" ");

  const allTextForCat = `${name} ${articlesText}`.toLowerCase();

  const KNOWN_TOPICS: Record<string, { emoji: string; description: string; archetype: string }> = {
    "seguridad": { emoji: "🔒", description: "percepción de inseguridad, delito y fuerzas de seguridad en Argentina", archetype: "villain" },
    "salud": { emoji: "🏥", description: "acceso al sistema de salud, calidad hospitalaria, medicamentos y cobertura médica en Argentina", archetype: "guardian" },
    "nutrición": { emoji: "🥗", description: "hambre, asistencia alimentaria, comedores comunitarios y calidad nutricional en Argentina", archetype: "villain" },
    "educación": { emoji: "📚", description: "calidad educativa, paros docentes, infraestructura escolar y acceso educativo en Argentina", archetype: "guardian" },
    "economía": { emoji: "💰", description: "inflación, salarios, empleo, dólar y poder adquisitivo en Argentina", archetype: "villain" },
    "medio ambiente": { emoji: "🌍", description: "contaminación, cambio climático, minería y recursos naturales en Argentina", archetype: "guardian" },
    "energía": { emoji: "⚡", description: "cortes de luz, tarifas eléctricas, subsidios y crisis energética en Argentina", archetype: "villain" },
    "vivienda": { emoji: "🏘️", description: "acceso a la tierra, alquileres, déficit habitacional y planes de vivienda en Argentina", archetype: "villain" },
    "empleo": { emoji: "💼", description: "desempleo, trabajo informal, precariedad laboral y oportunidades en Argentina", archetype: "villain" },
    "corrupción": { emoji: "⚖️", description: "corrupción gubernamental, transparencia institucional y confianza en el Estado en Argentina", archetype: "villain" },
    "narcotráfico": { emoji: "🚨", description: "narcotráfico, crimen organizado y narcocriminalidad en Argentina", archetype: "villain" },
    "pobreza": { emoji: "📉", description: "niveles de pobreza, indigencia, asistencia social y desigualdad en Argentina", archetype: "villain" },
    "inflación": { emoji: "📈", description: "inflación, aumento de precios, impacto en el consumo y poder adquisitivo en Argentina", archetype: "villain" },
    "drogas": { emoji: "💊", description: "consumo de sustancias, problemática de adicciones y políticas de salud mental en Argentina", archetype: "villain" },
  };

  const topicKey = Object.keys(KNOWN_TOPICS).find(k => name.toLowerCase().includes(k));
  const knownTopic = topicKey ? KNOWN_TOPICS[topicKey] : null;

  const isInfluencer = !knownTopic && /streamer|youtuber|influencer|twitch|streaming|gamer|content|tiktok|instagram|seguidor|suscriptor|coscu|mazza|olga|luquitas|martita|fort|gastón|papu/.test(allTextForCat);
  const isSport = !knownTopic && /futbol|tenis|basquet|deporte|atleta|nba|liga|cancha|gol|partido|jugador|entrenador|dt/.test(allTextForCat);
  const isArtist = !knownTopic && /cantante|actor|actriz|músico|banda|album|película|teatro|arte|cultura/.test(allTextForCat);

  const category = knownTopic ? "tema nacional" : (isInfluencer ? "influencer/streamer digital" : isSport ? "figura del deporte" : isArtist ? "figura del entretenimiento y la cultura" : "figura política");

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
      category: (geminiResult as any).category || category,
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

    const wikiDesc = articles.find((a: any) => a.source_name === "Wikipedia")?.description;
    const finalSummary = wikiDesc 
      ? wikiDesc.slice(0, 300) + "..."
      : (articles.length > 0
        ? `Análisis basado en ${articles.length} artículos recientes. ${ARCHETYPE_CONFIG[archetype].description}`
        : `No se encontraron noticias recientes sobre ${name}. Mostrando análisis estimado basado en comportamiento sociológico simulado.`);

    analysis = {
      id,
      name,
      category: category,
      archetype,
      archetypeScore: Math.round(60 + Math.random()*25),
      summary: finalSummary,
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
