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

    prompt = `Sos un experto consultor en marketing político y comunicación de crisis en Argentina.
Analizá el cruce competitivo entre dos figuras públicas. Tu cliente es la campaña de "${candidateA.name}".

Datos del Cliente (${candidateA.name}):
- Arquetipo: ${candidateA.archetype} (Puntaje: ${candidateA.archetypeScore})
- Aprobación: ${candidateA.metrics.approval} | Polarización: ${candidateA.metrics.polarization} | Confianza: ${candidateA.metrics.trust}

Datos del Adversario (${candidateB.name}):
- Arquetipo: ${candidateB.archetype} (Puntaje: ${candidateB.archetypeScore})
- Aprobación: ${candidateB.metrics.approval} | Polarización: ${candidateB.metrics.polarization} | Confianza: ${candidateB.metrics.trust}

REGLA DE POLARIZACIÓN: Si la polarización del Cliente (${candidateA.name}) es menor a 40 (baja polarización o apatía), incluí en tus 'strategicRecommendations' de qué manera polarizar directamente contra ${candidateB.name} y qué temas controversiales debería usar para traccionar mayor debate en la agenda pública.

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "verdict": "Resumen ejecutivo de 2 oraciones evaluando quién domina el escenario y por qué.",
  "strategicRecommendations": [
    "Directiva táctica accionable 1 (Ej: Aprovechar que B tiene baja confianza para lanzar notas en portales sobre transparencia...)",
    "Directiva táctica accionable 2",
    "Directiva táctica accionable 3"
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
