import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Caché en memoria para ahorrar tokens (se resetea con cada deploy)
const compareCache = new Map<string, { data: any; expiresAt: number }>();

export async function POST(request: NextRequest) {
  let prompt = "";
  let cacheKey = "";
  try {
    const body = await request.json();
    const { candidateA, candidateB } = body;

    if (!candidateA || !candidateB) {
      return NextResponse.json({ error: "Se requieren los datos de ambos candidatos" }, { status: 400 });
    }

    cacheKey = `${candidateA.id || candidateA.name}_vs_${candidateB.id || candidateB.name}`;
    const cached = compareCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ ...cached.data, fromCache: true });
    }

    if (!GEMINI_API_KEY) {
      // Fallback si no hay API key
      const fallbackData = {
        strategicRecommendations: [
          `Focalizar esfuerzos de campaña digital en los territorios donde ${candidateA.name} presenta mayor confianza que ${candidateB.name}.`,
          `Desarrollar una narrativa de contraste basada en el arquetipo de ${candidateA.archetype}.`,
          `Optimizar el discurso en redes sociales para capitalizar las debilidades detectadas en el adversario.`
        ],
        verdict: "Análisis generado por heurística local debido a la falta de conexión con el motor IA."
      };
      compareCache.set(cacheKey, { data: fallbackData, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      return NextResponse.json(fallbackData);
    }

    const isInfluencer = (s: string) => /streamer|youtuber|influencer|twitch|tiktok|instagram|gamer|content|fort|mazza|coscu|olga/i.test(s);
    const isSport = (s: string) => /futbol|tenis|deporte|atleta|jugador|dt|gol|cancha/i.test(s);
    const sectorA = isInfluencer(`${candidateA.name} ${candidateA.archetype}`) ? "influencer/streamer digital" :
                    isSport(`${candidateA.name}`) ? "figura del deporte" : "figura pública";
    const sectorB = isInfluencer(`${candidateB.name} ${candidateB.archetype}`) ? "influencer/streamer digital" :
                    isSport(`${candidateB.name}`) ? "figura del deporte" : "figura pública";

    prompt = `Sos el consultor de inteligencia de audiencias más brutal y honesto de Argentina. Analizás el cruce competitivo entre dos figuras públicas en el ecosistema de la opinión argentina. Tu cliente es quien representa a "${candidateA.name}".

PERFIL DE ${candidateA.name} (${sectorA}) — TU CLIENTE:
- Arquetipo: ${candidateA.archetype} (Puntaje de confianza: ${candidateA.archetypeScore}%)
- Aprobación: ${candidateA.metrics.approval}/100 | Polarización: ${candidateA.metrics.polarization}/100 | Confianza: ${candidateA.metrics.trust}/100 | Movilización: ${candidateA.metrics.mobilization}/100
- Sentimiento global: ${Math.round(((candidateA.sentimentOverall || 0) + 1) / 2 * 100)}% positivo

PERFIL DE ${candidateB.name} (${sectorB}) — EL ADVERSARIO/COMPETIDOR:
- Arquetipo: ${candidateB.archetype} (Puntaje de confianza: ${candidateB.archetypeScore}%)
- Aprobación: ${candidateB.metrics.approval}/100 | Polarización: ${candidateB.metrics.polarization}/100 | Confianza: ${candidateB.metrics.trust}/100 | Movilización: ${candidateB.metrics.mobilization}/100
- Sentimiento global: ${Math.round(((candidateB.sentimentOverall || 0) + 1) / 2 * 100)}% positivo

REGLAS DE ORO:
1. PROHIBIDO ser genérico. El veredicto y cada recomendación deben citar datos concretos de estas dos figuras específicas.
2. Analizá el matchup dentro del contexto adecuado: si son influencers, hablá de comunidades, marcas y alcance digital. Si son políticos, hablá de votos, territorios y poder institucional. Si son deportistas, hablá de rendimiento y valor de marca.
3. Las recomendaciones deben ser tácticas reales, del tipo que daría un consultor que cobra en dólares. Nada de "mejorar la presencia en redes" sin un HOW.
4. Si la polarización del cliente es menor a 40, incluí una directiva de confrontación directa contra el adversario.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "verdict": "Veredicto ejecutivo de 3-4 oraciones. Específico: quién domina, en qué métricas concretas, y cuál es el punto exacto de vulnerabilidad del adversario que el cliente puede explotar ahora mismo.",
  "strategicRecommendations": [
    "DIRECTIVA 1: Acción específica con target claro — Ej: Lanzar contenido de contraste sobre [tema X] donde [Adversario] tiene [debilidad Y] para capturar la audiencia de [demografía Z]...",
    "DIRECTIVA 2: Táctica concreta de posicionamiento basada en la brecha de [métrica concreta]...",
    "DIRECTIVA 3: Movimiento audaz para explotar el punto débil más crítico del adversario..."
  ]
}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean);

    compareCache.set(cacheKey, { data: parsed, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    return NextResponse.json({ ...parsed, fromCache: false });

  } catch (error: any) {
    console.error("Gemini Compare Error, attempting Groq fallback:", error);
    
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

      if (cacheKey) {
        compareCache.set(cacheKey, { data: parsed, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      }
      return NextResponse.json({ ...parsed, fromCache: false, fromFallback: true });

    } catch (groqErr) {
      console.error("Groq fallback error:", groqErr);
      return NextResponse.json({
        strategicRecommendations: [
          "El motor semántico encontró un error temporal. Reforzar presencia mediática tradicional.",
          "Mantener la agenda de comunicación estable mientras se recalculan los datos.",
          "Analizar manualmente los radares de competitividad."
        ],
        verdict: "Error de procesamiento en la nube."
      });
    }
  }
}
