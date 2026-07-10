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
  if (!GEMINI_API_KEY && !(process.env.XAI_API_KEY || process.env.GROK_API_KEY)) return null;

  const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
  const model = genAI ? genAI.getGenerativeModel({ model: "gemini-flash-latest" }) : null;

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
      if (!model) throw new Error("Gemini model not initialized for topic");
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Gemini topic response");
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, aiPowered: true };
    } catch (topicErr) {
      console.error("Gemini topic error, trying Grok topic fallback:", topicErr);
      
      const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
      if (XAI_API_KEY) {
        try {
          console.log("Attempting Grok (xAI) topic fallback...");
          const grokRes = await fetch("https://api.xai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${XAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "grok-2",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              response_format: { type: "json_object" }
            })
          });
          if (grokRes.ok) {
            const grokData = await grokRes.json();
            const text = grokData.choices[0].message.content.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return { ...parsed, aiPowered: true, engine: "grok" };
            }
          }
        } catch (grokErr) {
          console.error("Grok topic fallback error:", grokErr);
        }
      }
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
    if (!model) throw new Error("Gemini model not initialized for personality");
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");
    const parsed = JSON.parse(jsonMatch[0]);
    return { ...parsed, aiPowered: true };
  } catch (err) {
    console.error("Gemini error, attempting fallback...");
    
    // 1. Fallback Grok (xAI)
    const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (XAI_API_KEY) {
      try {
        console.log("Attempting Grok (xAI) fallback...");
        const grokRes = await fetch("https://api.xai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${XAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "grok-2",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });
        if (grokRes.ok) {
          const grokData = await grokRes.json();
          const text = grokData.choices[0].message.content.trim();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { ...parsed, aiPowered: true, engine: "grok" };
          }
        } else {
          console.error(`Grok API error: ${grokRes.status} ${grokRes.statusText}`);
        }
      } catch (grokErr) {
        console.error("Grok fallback error:", grokErr);
      }
    }

    // 2. Fallback Groq (Llama 3.3)
    try {
      console.log("Attempting Groq (Llama 3.3) fallback...");
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
      return { ...parsed, aiPowered: true, fromFallback: true, engine: "groq" };
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

    // ── Detección de Fallbacks de Temas Nacionales ──
    const TOPIC_FALLBACKS: Record<string, {
      summary: string;
      positiveNarratives: string[];
      negativeNarratives: string[];
      recommendations: string[];
      allies: Array<{ name: string; strength: number; reason: string }>;
      enemies: Array<{ name: string; conflictLevel: number; reason: string }>;
    }> = {
      "seguridad": {
        summary: "La seguridad en Argentina se mantiene como una de las demandas sociales más urgentes. La opinión pública muestra altos niveles de preocupación frente a la criminalidad urbana y el avance del narcotráfico, especialmente en focos críticos como Rosario y el conurbano bonaerense. Existe un fuerte debate entre políticas de mano dura y prevención integral.",
        positiveNarratives: [
          "Se valora positivamente la mayor presencia de fuerzas federales y de seguridad militarizadas en zonas conflictivas.",
          "Apoyo social a las auditorías estatales destinadas a desarticular la connivencia policial."
        ],
        negativeNarratives: [
          "La ineficacia de la prevención urbana perpetúa la fatiga frente al delito diario.",
          "Cuestionamientos a la falta de reformas integrales en el sistema penitenciario y judicial."
        ],
        recommendations: [
          "Implementar cuadrantes de patrullaje preventivo inteligente apoyados por análisis predictivo digital.",
          "Reforzar la coordinación interagencial entre fuerzas provinciales y federales en el NOA y Rosario.",
          "Instalar canales digitales directos de denuncia barrial anónima para saltear trabas burocráticas."
        ],
        allies: [
          { name: "Fuerzas Federales", strength: 85, reason: "Mayor despliegue en territorio" },
          { name: "Ministerio de Seguridad", strength: 90, reason: "Coordinación de operativos" },
          { name: "Gendarmería Nacional", strength: 80, reason: "Control de pasos fronterizos" }
        ],
        enemies: [
          { name: "Crimen Organizado", conflictLevel: 95, reason: "Disputa por control territorial" },
          { name: "Microtráfico Barrial", conflictLevel: 90, reason: "Erosión de seguridad en barrios" },
          { name: "Corrupción Policial", conflictLevel: 85, reason: "Filtración de información y amparo" }
        ]
      },
      "salud": {
        summary: "El sistema de salud argentino enfrenta una crisis estructural por la desregulación de las prepagas, el encarecimiento de medicamentos y la falta de insumos médicos. Los hospitales públicos sufren saturación por la migración de pacientes de obras sociales caídas, y persisten las tensiones gremiales por salarios médicos depreciados.",
        positiveNarratives: [
          "Se destaca la resiliencia y el compromiso de los profesionales de salud pública.",
          "Valoración positiva de la simplificación de recetas digitales y la modernización de trámites."
        ],
        negativeNarratives: [
          "Gran disconformidad social por el fuerte aumento acumulado en las cuotas de medicina privada.",
          "Saturación de guardias y falta de turnos programados a mediano plazo en hospitales municipales."
        ],
        recommendations: [
          "Crear un fondo de emergencia provincial para insumos de alta complejidad y medicamentos oncológicos.",
          "Optimizar el sistema de turnos mediante una plataforma de telemedicina integrada.",
          "Revisar las paritarias del personal de salud para contrarrestar la fuga de talentos al sector privado."
        ],
        allies: [
          { name: "Personal Médico", strength: 85, reason: "Sostén operativo de las guardias" },
          { name: "Hospitales Públicos", strength: 80, reason: "Contención de demanda social" },
          { name: "Plataformas de Telemedicina", strength: 75, reason: "Descompresión de guardias" }
        ],
        enemies: [
          { name: "Inflación de Medicamentos", conflictLevel: 90, reason: "Suba de costos en insumos básicos" },
          { name: "Obras Sociales Caídas", conflictLevel: 85, reason: "Migración masiva al sistema público" },
          { name: "Monopolios Farmacéuticos", conflictLevel: 80, reason: "Fijación de precios de referencia" }
        ]
      },
      "nutrición": {
        summary: "La percepción sobre la nutrición e inocuidad alimentaria está atravesada por el aumento de precios en alimentos básicos de la canasta. La suspensión de envíos de alimentos a comedores comunitarios y las auditorías estatales generan rispideces y disputas constantes entre movimientos sociales y el gobierno nacional.",
        positiveNarratives: [
          "Respaldo social a la transparencia y auditoría del destino de los fondos alimentarios.",
          "Programas de asistencia alimentaria directa (como Tarjeta Alimentar) llegan sin intermediarios."
        ],
        negativeNarratives: [
          "Preocupación por la calidad calórica y falta de proteínas en las dietas de sectores vulnerables.",
          "Conflictos por la demora en la entrega de mercadería a comedores comunitarios."
        ],
        recommendations: [
          "Ampliar la cobertura nutricional de viandas escolares sumando carnes y legumbres.",
          "Fortalecer los convenios directos con pymes lácteas y cooperativas de la agricultura familiar.",
          "Monitorear sistemáticamente el peso y talla en centros de primera infancia."
        ],
        allies: [
          { name: "Centros Conin", strength: 85, reason: "Combate a la desnutrición infantil" },
          { name: "Tarjeta Alimentar", strength: 90, reason: "Transferencia directa de fondos" },
          { name: "Escuelas Públicas", strength: 80, reason: "Comedores escolares diarios" }
        ],
        enemies: [
          { name: "Monopolios Alimenticios", conflictLevel: 85, reason: "Fijación de precios de la canasta básica" },
          { name: "Intermediarios Políticos", conflictLevel: 90, reason: "Desvío e clientelismo de asistencia" },
          { name: "Inflación de Alimentos", conflictLevel: 95, reason: "Pérdida de poder adquisitivo real" }
        ]
      },
      "educación": {
        summary: "La educación pública se encuentra bajo una intensa tensión presupuestaria y salarial, marcada por paros docentes recurrentes y el debate por el financiamiento de las universidades nacionales. Si bien se valora la educación pública como vector de movilidad social, se cuestiona fuertemente la pérdida de días de clase y la caída del nivel de aprendizaje.",
        positiveNarratives: [
          "Consenso absoluto sobre la importancia histórica de la educación como vector de movilidad social.",
          "Apoyo a la modernización de planes de estudio técnicos en el nivel secundario."
        ],
        negativeNarratives: [
          "Fuerte preocupación por la pérdida de días de clase por paros y problemas edilicios.",
          "Fricción presupuestaria por los fondos destinados al mantenimiento de universidades nacionales."
        ],
        recommendations: [
          "Implementar un plan de infraestructura escolar de emergencia con financiamiento público-privado.",
          "Vincular la formación técnica superior directamente con las demandas del sector productivo local.",
          "Desarrollar plataformas de tutorías digitales obligatorias para nivelar matemáticas y lengua."
        ],
        allies: [
          { name: "Comunidad Universitaria", strength: 85, reason: "Defensa del presupuesto académico" },
          { name: "Colegios Técnicos", strength: 80, reason: "Inserción laboral rápida" },
          { name: "Plataformas Educativas", strength: 70, reason: "Recursos didácticos digitales" }
        ],
        enemies: [
          { name: "Deserción Escolar", conflictLevel: 90, reason: "Abandono temprano en secundaria" },
          { name: "Deterioro de Infraestructura", conflictLevel: 85, reason: "Aulas sin calefacción o servicios básicos" },
          { name: "Conflictividad Gremial", conflictLevel: 80, reason: "Paros y suspensión de clases" }
        ]
      },
      "economía": {
        summary: "La situación económica general muestra una fuerte contracción del consumo masivo y la actividad industrial, en un marco de ajuste fiscal severo. La reducción del déficit fiscal se contrapone con la pérdida de poder adquisitivo de salarios y jubilaciones, polarizando la opinión pública sobre la viabilidad del modelo.",
        positiveNarratives: [
          "Aprobación de la política de equilibrio fiscal absoluto y baja sistemática del riesgo país.",
          "Expectativa positiva respecto a la desregulación de mercados y atracción de inversiones."
        ],
        negativeNarratives: [
          "Caída abrupta en los niveles de consumo minorista y ventas en comercios de cercanía.",
          "Impacto recesivo en la pequeña y mediana empresa debido al encarecimiento de insumos."
        ],
        recommendations: [
          "Estimular el consumo mediante facilidades de financiamiento en cuotas sin interés para bienes durables.",
          "Implementar alivio fiscal y reducción de cargas patronales para micropymes generadoras de empleo.",
          "Garantizar la recomposición de haberes previsionales en sintonía con la canasta básica de adultos mayores."
        ],
        allies: [
          { name: "Sector Financiero", strength: 90, reason: "Baja de tasas y riesgo país" },
          { name: "Cámaras Exportadoras", strength: 85, reason: "Liquidación de divisas" },
          { name: "Organismos de Crédito", strength: 80, reason: "Apoyo a reformas fiscales" }
        ],
        enemies: [
          { name: "Recesión Industrial", conflictLevel: 90, reason: "Parates de planta por caída de demanda" },
          { name: "Déficit Comercial de Pymes", conflictLevel: 80, reason: "Aumento de costos fijos" },
          { name: "Erosión Salarial", conflictLevel: 95, reason: "Pérdida de poder de compra real" }
        ]
      },
      "medio ambiente": {
        summary: "El debate ambiental en el país gira en torno a la tensión entre el desarrollo productivo extractivista (minería de litio, Vaca Muerta, agronegocio) y la conservación de recursos naturales. Persisten reclamos por la ley de humedales y protestas locales contra la exploración petrolera offshore en la costa atlántica.",
        positiveNarratives: [
          "Oportunidad histórica de generación de divisas por exportación de litio y gas licuado.",
          "Creciente concientización social y activismo juvenil por el reciclado y cuidado del agua."
        ],
        negativeNarratives: [
          "Preocupación por el impacto hídrico y ambiental de la megaminería en zonas cordilleranas.",
          "Rechazo vecinal a la exploración petrolera en áreas de reserva marina costera."
        ],
        recommendations: [
          "Auditar con estándares internacionales el uso de agua en la explotación de litio.",
          "Fomentar la inversión en parques solares y eólicos mediante exenciones impositivas.",
          "Avanzar en una ley de humedales con participación de sectores productivos y científicos."
        ],
        allies: [
          { name: "Energías Renovables", strength: 80, reason: "Crecimiento de parques eólicos" },
          { name: "ONGs Ambientales", strength: 75, reason: "Presión social por conservación" },
          { name: "Centros Científicos", strength: 85, reason: "Monitoreo del impacto ambiental" }
        ],
        enemies: [
          { name: "Derrames Petroleros", conflictLevel: 85, reason: "Riesgos ecológicos marinos" },
          { name: "Sequía Prolongada", conflictLevel: 90, reason: "Impacto en las cuencas productoras" },
          { name: "Extractivismo Sin Control", conflictLevel: 80, reason: "Falta de control ambiental local" }
        ]
      },
      "energía": {
        summary: "El sector energético está dominado por la quita progresiva de subsidios estatales y el aumento exponencial de tarifas de luz y gas. El humor social refleja fatiga por el costo de las facturas en hogares y comercios, mientras persisten reclamos por la calidad del servicio de distribución en épocas de alta demanda estacional.",
        positiveNarratives: [
          "Consenso sobre la necesidad de sincerar tarifas para evitar desinversión crónica.",
          "Crecimiento récord de producción de hidrocarburos no convencionales en Vaca Muerta."
        ],
        negativeNarratives: [
          "Alto malestar social por el peso de las tarifas en el presupuesto familiar y PyME.",
          "Persistencia de cortes de servicio por saturación de redes de distribución urbana."
        ],
        recommendations: [
          "Ampliar los criterios de la tarifa social para proteger a los hogares de ingresos medios-bajos.",
          "Implementar planes de inversión obligatorios y auditados mensualmente para las distribuidoras.",
          "Promover el autoabastecimiento energético industrial mediante paneles solares."
        ],
        allies: [
          { name: "Vaca Muerta", strength: 95, reason: "Récord de producción de gas y crudo" },
          { name: "Cámaras Energéticas", strength: 85, reason: "Inversiones en transporte" },
          { name: "Tarifa Social Integrada", strength: 80, reason: "Filtro de contención a vulnerables" }
        ],
        enemies: [
          { name: "Subsidios Crónicos", conflictLevel: 90, reason: "Presión sobre el déficit fiscal" },
          { name: "Distribuidoras Eléctricas", conflictLevel: 85, reason: "Falta de inversión en redes locales" },
          { name: "Saturación Térmica", conflictLevel: 80, reason: "Cortes de suministro por calor extremo" }
        ]
      },
      "vivienda": {
        summary: "El acceso a la vivienda en Argentina se encuentra sumamente restringido por la escasez de crédito hipotecario accesible y la desregulación del mercado de alquileres tras la derogación de la ley. Las dificultades para el pago de expensas y alquileres empujan a sectores medios al hacinamiento.",
        positiveNarratives: [
          "Mayor oferta de propiedades en alquiler tras la desregulación de contratos.",
          "Reaparición de créditos hipotecarios UVA impulsados por la baja de la inflación."
        ],
        negativeNarratives: [
          "Altos costos iniciales de ingreso a contratos que superan la capacidad de ahorro.",
          "Falta de planes de urbanización estatal y de infraestructura básica en asentamientos informales."
        ],
        recommendations: [
          "Fomentar líneas de crédito blandas para la refacción y ampliación de viviendas familiares.",
          "Generar incentivos fiscales a desarrolladores que construyan viviendas de alquiler social.",
          "Avanzar en la escrituración masiva y regularización dominial de barrios vulnerables."
        ],
        allies: [
          { name: "Créditos UVA", strength: 80, reason: "Acceso al crédito tras años de sequía" },
          { name: "Cámara Inmobiliaria", strength: 85, reason: "Aumento de la oferta en alquiler" },
          { name: "Programas de Escrituración", strength: 75, reason: "Regularización dominial urbana" }
        ],
        enemies: [
          { name: "Déficit Habitacional", conflictLevel: 90, reason: "Falta estructural de viviendas" },
          { name: "Especulación de Suelo", conflictLevel: 85, reason: "Precios dolarizados inaccesibles" },
          { name: "Falta de Crédito a Tasa Fija", conflictLevel: 95, reason: "Exclusión de sectores de menores ingresos" }
        ]
      },
      "empleo": {
        summary: "El mercado laboral muestra tasas estables de desempleo pero con un marcado deterioro de la calidad del empleo, caracterizado por la proliferación de monotributistas, empleo informal sin cobertura social y salarios por debajo de la línea de pobreza. Las reformas de flexibilización laboral polarizan el debate legislativo.",
        positiveNarratives: [
          "Generación de puestos dinámicos en economía del conocimiento y minería.",
          "Apoyo empresarial a la reforma para reducir multas laborales e incentivar contrataciones."
        ],
        negativeNarratives: [
          "Pérdida de empleo formal en el sector de la construcción y obra pública.",
          "Precarización creciente por el avance de plataformas digitales sin encuadre laboral."
        ],
        recommendations: [
          "Desarrollar programas de reconversión laboral subvencionados en tecnologías digitales.",
          "Reducir temporalmente cargas patronales para el primer empleo en jóvenes sub-25.",
          "Establecer paritarias ágiles para evitar el rezago de salarios formales frente al costo de vida."
        ],
        allies: [
          { name: "Economía del Conocimiento", strength: 90, reason: "Demanda de perfiles tecnológicos" },
          { name: "Sector Minero/Litio", strength: 85, reason: "Creación de empleo registrado regional" },
          { name: "PyMEs Productivas", strength: 75, reason: "Necesidad de menor carga fiscal" }
        ],
        enemies: [
          { name: "Informalidad Laboral", conflictLevel: 95, reason: "Trabajo sin aportes ni obra social" },
          { name: "Frenazo de la Construcción", conflictLevel: 90, reason: "Parálisis por suspensión de obra pública" },
          { name: "Salario Mínimo Insuficiente", conflictLevel: 90, reason: "Bajos ingresos en el sector informal" }
        ]
      },
      "corrupción": {
        summary: "La corrupción institucional y gubernamental continúa siendo una de las principales preocupaciones que erosionan la confianza en el Estado. Las denuncias cruzadas, las auditorías en organismos públicos discontinuados y las tensiones en el Poder Judicial generan un clima constante de sospecha y polarización partidaria.",
        positiveNarratives: [
          "Fuerte respaldo social a las auditorías exhaustivas y eliminación de intermediarios.",
          "Avances en la digitalización del Estado para reducir ventanillas y discrecionalidad."
        ],
        negativeNarratives: [
          "Escepticismo general por la demora judicial en resolver causas de corrupción complejas.",
          "Uso político de denuncias para desgastar adversarios sin resolución de fondo."
        ],
        recommendations: [
          "Fortalecer la autonomía técnica de la Oficina Anticorrupción y la Sindicatura de la Nación.",
          "Implementar compras y contrataciones públicas mediante subastas electrónicas transparentes.",
          "Acelerar los procesos penales mediante juicios por jurados en delitos contra la administración."
        ],
        allies: [
          { name: "Auditorías Estatales", strength: 90, reason: "Detección de irregularidades presupuestarias" },
          { name: "Firma Digital", strength: 85, reason: "Transparencia y trazabilidad del gasto" },
          { name: "Transparencia Internacional", strength: 75, reason: "Vigilancia de estándares y rankings" }
        ],
        enemies: [
          { name: "Causas Judiciales Cajoneadas", conflictLevel: 90, reason: "Impunidad percibida por demoras" },
          { name: "Sobreprecios en Licitaciones", conflictLevel: 85, reason: "Cartelización de proveedores del Estado" },
          { name: "Fuga de Fondos Públicos", conflictLevel: 95, reason: "Desvío a través de falsas contrataciones" }
        ]
      },
      "narcotráfico": {
        summary: "La narcocriminalidad ha escalado a nivel de emergencia nacional, con epicentro en la ciudad de Rosario. La opinión pública respalda la intervención de fuerzas federales y de seguridad militarizadas, pero cuestiona la falta de control en las fronteras y la presunta connivencia de sectores policiales y judiciales.",
        positiveNarratives: [
          "Disminución inicial de balaceras y extorsiones en Rosario tras operativos conjuntos.",
          "Mayor incautación de precursores químicos y destrucción de cocinas locales."
        ],
        negativeNarratives: [
          "Temor a represalias violentas y amenazas contra funcionarios y ciudadanos.",
          "Lavado de dinero del narcotráfico a través de emprendimientos urbanos sin controles."
        ],
        recommendations: [
          "Establecer tribunales penales especiales de alta seguridad para juzgar capos narco.",
          "Profundizar la inteligencia financiera sobre operaciones de compra de inmuebles y divisas locales.",
          "Instalar escáneres de última generación en los principales puertos fluviales de la hidrovía."
        ],
        allies: [
          { name: "Unidad Financiera (UIF)", strength: 85, reason: "Bloqueo de cuentas de lavado" },
          { name: "Fuerzas Especiales", strength: 90, reason: "Operativos tácticos en zonas calientes" },
          { name: "Cooperación Internacional", strength: 80, reason: "Inteligencia compartida con DEA/Interpol" }
        ],
        enemies: [
          { name: "Carteles de Rosario", conflictLevel: 98, reason: "Disputa armada por monopolio del territorio" },
          { name: "Lavado en Especulación", conflictLevel: 90, reason: "Inyecciones financieras en mercados locales" },
          { name: "Zonas Liberadas", conflictLevel: 90, reason: "Connivencia de policía local con bandas" }
        ]
      },
      "pobreza": {
        summary: "La pobreza en Argentina ha registrado niveles alarmantes que superan el 50% de la población activa, arrastrada por la devaluación y la alta inflación acumulada. El debate gira en torno a la efectividad de la ayuda social directa versus la generación de empleo genuino como única salida sustentable a largo plazo.",
        positiveNarratives: [
          "Ampliación del presupuesto de asignaciones universales para atenuar la indigencia extrema.",
          "Esfuerzos colectivos de iglesias y ONGs que sostienen redes de contención local."
        ],
        negativeNarratives: [
          "Crecimiento de la pobreza estructural que ya afecta a tres generaciones de familias.",
          "Caída abrupta de la clase media hacia situaciones de vulnerabilidad por aumentos fijos."
        ],
        recommendations: [
          "Indexar de forma automática los programas de contención básica al índice de inflación real.",
          "Crear un régimen de transición laboral: subsidio como parte de pago del sueldo PyME registrado.",
          "Reforzar la red de contención de primera infancia en el conurbano y provincias del norte."
        ],
        allies: [
          { name: "Asignación Universal", strength: 90, reason: "Sostén de ingresos directos familiares" },
          { name: "Redes Solidarias", strength: 85, reason: "Contención comunitaria en barrios" },
          { name: "Cáritas Argentina", strength: 80, reason: "Ayuda social y comedores a nivel federal" }
        ],
        enemies: [
          { name: "Espiral Inflacionaria", conflictLevel: 95, reason: "Erosión permanente del poder adquisitivo" },
          { name: "Desempleo Joven", conflictLevel: 85, reason: "Falta de inserción de las nuevas generaciones" },
          { name: "Informalidad Crónica", conflictLevel: 90, reason: "Exclusión de derechos y aportes" }
        ]
      },
      "inflación": {
        summary: "La inflación se mantiene como el principal flagelo de la economía familiar, deteriorando diariamente el poder de compra de los argentinos. Aunque el gobierno muestra una tendencia de desaceleración mensual en los índices oficiales, la percepción social sigue siendo de extrema fragilidad debido a la acumulación de aumentos en tarifas y servicios públicos.",
        positiveNarratives: [
          "Baja sostenida de los índices mensuales oficiales de inflación del INDEC.",
          "Estabilidad cambiaria del dólar que frena el traslado preventivo a góndolas."
        ],
        negativeNarratives: [
          "Los precios de alimentos y medicamentos se mantienen consolidados en niveles altísimos.",
          "La suba de tarifas de transporte y servicios públicos ejerce una fuerte presión residual."
        ],
        recommendations: [
          "Promover la competencia de precios mediante la apertura controlada de importaciones de consumo masivo.",
          "Mantener la disciplina de emisión monetaria cero para estabilizar el valor del peso.",
          "Fomentar acuerdos de libre competencia en grandes cadenas logísticas y supermercados."
        ],
        allies: [
          { name: "Estabilidad del Dólar", strength: 90, reason: "Ancla cambiaria contra la volatilidad" },
          { name: "Déficit Fiscal Cero", strength: 95, reason: "Fin del financiamiento monetario" },
          { name: "Apertura de Importaciones", strength: 80, reason: "Presión a la baja por competencia exterior" }
        ],
        enemies: [
          { name: "Tarifazos Residuales", conflictLevel: 85, reason: "Ajustes de precios regulados de servicios" },
          { name: "Expectativas Indexatorias", conflictLevel: 80, reason: "Remarcación preventiva por inercia" },
          { name: "Costos Logísticos Internos", conflictLevel: 85, reason: "Fletes terrestres encarecidos por combustibles" }
        ]
      },
      "drogas": {
        summary: "El consumo de sustancias psicoactivas y las adicciones en los jóvenes representan un problema grave de salud pública, agudizado por la falta de centros de rehabilitación estatales accesibles. Hay debates en torno a la despenalización del consumo personal frente a la necesidad de endurecer las penas al microtráfico.",
        positiveNarratives: [
          "Mayor visibilidad social de la problemática de salud mental en la agenda pública.",
          "Campañas comunitarias de prevención y talleres de oficios para jóvenes vulnerables."
        ],
        negativeNarratives: [
          "Falta total de vacantes en centros públicos de internación y rehabilitación de adicciones.",
          "Aumento de la delincuencia menor vinculada al financiamiento del consumo barrial."
        ],
        recommendations: [
          "Construir centros de día municipales especializados en adicciones en barrios vulnerables.",
          "Implementar el abordaje preventivo en el currículo de escuelas secundarias públicas y privadas.",
          "Articular juzgados de drogas para derivar infractores menores no violentos a tratamiento obligatorio."
        ],
        allies: [
          { name: "Centros de Día", strength: 80, reason: "Acompañamiento ambulatorio municipal" },
          { name: "Red de Salud Mental", strength: 85, reason: "Profesionales de contención terapéutica" },
          { name: "Clubes de Barrio", strength: 75, reason: "Inclusión social a través del deporte" }
        ],
        enemies: [
          { name: "Microtráfico Escolar", conflictLevel: 90, reason: "Venta minorista en zonas escolares" },
          { name: "Paco/Sustancias Baratas", conflictLevel: 95, reason: "Alto daño neurológico y fácil acceso" },
          { name: "Falta de Presupuesto en Salud", conflictLevel: 85, reason: "Inexistencia de camas públicas de desintoxicación" }
        ]
      }
    };

    const topicKeyFallback = Object.keys(TOPIC_FALLBACKS).find(k => name.toLowerCase().includes(k));
    const topicFallbackData = topicKeyFallback ? TOPIC_FALLBACKS[topicKeyFallback] : {
      summary: `El análisis nacional de ${name} revela desafíos y tensiones dentro de la agenda de políticas públicas de Argentina. La percepción pública oscila entre el reclamo por soluciones urgentes y la resistencia al impacto del ajuste de tarifas y reordenamiento fiscal en el sector.`,
      positiveNarratives: [
        "Se valora positivamente la búsqueda de transparencia e institucionalidad en el sector.",
        "Expectativa de ordenamiento de precios regulados a mediano plazo."
      ],
      negativeNarratives: [
        "El impacto del ajuste de tarifas genera un fuerte desgaste en el presupuesto familiar.",
        "Falta de coordinación entre políticas federales y provinciales para atenuar la crisis."
      ],
      recommendations: [
        "Establecer mesas de diálogo sectorial con participación de provincias y cámaras empresarias.",
        "Fortalecer tarifas sociales o subsidios cruzados para el decil de menores ingresos.",
        "Auditar con estándares de transparencia el uso de fondos destinados al mantenimiento del área."
      ],
      allies: [
        { name: "Secretaría del Área", strength: 80, reason: "Coordinación federal de la política" },
        { name: "Organismos Reguladores", strength: 75, reason: "Control de calidad y tarifas" }
      ],
      enemies: [
        { name: "Inflación Sectorial", conflictLevel: 85, reason: "Aumento de costos operativos e insumos" },
        { name: "Conflictividad Gremial", conflictLevel: 80, reason: "Frenos por tensiones salariales" }
      ]
    };

    let finalSummary, finalNarratives, finalRecommendations, finalAllies, finalEnemies;

    if (category === "tema nacional") {
      finalSummary = topicFallbackData.summary;
      finalNarratives = {
        positive: topicFallbackData.positiveNarratives,
        negative: topicFallbackData.negativeNarratives
      };
      finalRecommendations = topicFallbackData.recommendations;
      finalAllies = topicFallbackData.allies;
      finalEnemies = topicFallbackData.enemies;
    } else {
      const wikiDesc = articles.find((a: any) => a.source_name === "Wikipedia")?.description;
      finalSummary = wikiDesc 
        ? wikiDesc.slice(0, 300) + "..."
        : (articles.length > 0
          ? `Análisis basado en ${articles.length} artículos recientes. ${ARCHETYPE_CONFIG[archetype].description}`
          : `No se encontraron noticias recientes sobre ${name}. Mostrando análisis estimado basado en comportamiento sociológico simulado.`);
      
      finalNarratives = {
        positive: ["Las menciones en tono neutral a positivo sugieren cierto margen de tolerancia social."],
        negative: ["La polarización inherente a la figura genera fricción constante en el ecosistema mediático."]
      };
      finalRecommendations = [
        "Monitorear la evolución de la imagen en las próximas semanas.",
        "Cruzar datos de medios con métricas de redes sociales."
      ];
      finalAllies = [
        { name: "Aliado 1", strength: 85, reason: "Afinidad política" },
        { name: "Aliado 2", strength: 70, reason: "Apoyo discursivo" }
      ];
      finalEnemies = [
        { name: "Adversario 1", conflictLevel: 90, reason: "Polarización directa" },
        { name: "Adversario 2", conflictLevel: 75, reason: "Competencia electoral" }
      ];
    }

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
      strategicRecommendations: finalRecommendations,
      trend: "stable" as const,
      archetypeReasoning: category === "tema nacional" 
        ? "El arquetipo refleja la postura defensiva y protectora del Estado en regular y sostener este sector frente a la crisis."
        : "Arquetipo asignado algorítmicamente en base a las métricas superficiales de aprobación y polarización de noticias.",
      narratives: finalNarratives,
      advancedMetrics: {
        narrativeContagion: { index: metrics.resonance, explanation: "Estimación heurística de viralidad." },
        cognitiveDissonance: { gap: 30, explanation: "Estimación heurística sin IA." },
        emotionalSynchrony: { score: 50, regions: ["Todo el país"], explanation: "Estimación." },
        amplifiers: category === "tema nacional" ? ["Medios Sectoriales", "Redes Sociales"] : ["Redes Sociales", "Medios Locales"],
        hardAgendaCorrelation: "Estimación de impacto del humor social.",
        network: {
          allies: finalAllies,
          enemies: finalEnemies
        },
        timeline: [
          { month: "Mes -5", approval: Math.round(Math.max(10, Math.min(95, metrics.approval + (category === "tema nacional" ? 4 : 8)))), polarization: Math.round(Math.max(10, Math.min(95, metrics.polarization - 5))), dissonance: 25 },
          { month: "Mes -4", approval: Math.round(Math.max(10, Math.min(95, metrics.approval + (category === "tema nacional" ? -2 : 5)))), polarization: Math.round(Math.max(10, Math.min(95, metrics.polarization - 2))), dissonance: 28 },
          { month: "Mes -3", approval: Math.round(Math.max(10, Math.min(95, metrics.approval + (category === "tema nacional" ? 3 : 2)))), polarization: Math.round(Math.max(10, Math.min(95, metrics.polarization + 1))), dissonance: 30 },
          { month: "Mes -2", approval: Math.round(Math.max(10, Math.min(95, metrics.approval - 3))), polarization: Math.round(Math.max(10, Math.min(95, metrics.polarization + 4))), dissonance: 35 },
          { month: "Mes -1", approval: Math.round(Math.max(10, Math.min(95, metrics.approval - 1))), polarization: Math.round(Math.max(10, Math.min(95, metrics.polarization + 2))), dissonance: 32 },
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
