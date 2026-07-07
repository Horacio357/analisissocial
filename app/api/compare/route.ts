import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateA, candidateB } = body;

    if (!candidateA || !candidateB) {
      return NextResponse.json({ error: "Se requieren los datos de ambos candidatos" }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      // Fallback si no hay API key
      return NextResponse.json({
        strategicRecommendations: [
          `Focalizar esfuerzos de campaña digital en los territorios donde ${candidateA.name} presenta mayor confianza que ${candidateB.name}.`,
          `Desarrollar una narrativa de contraste basada en el arquetipo de ${candidateA.archetype}.`,
          `Optimizar el discurso en redes sociales para capitalizar las debilidades detectadas en el adversario.`
        ],
        verdict: "Análisis generado por heurística local debido a la falta de conexión con el motor IA."
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Sos un experto consultor en marketing político y comunicación de crisis en Argentina.
Analizá el cruce competitivo entre dos figuras públicas. Tu cliente es la campaña de "${candidateA.name}".

Datos del Cliente (${candidateA.name}):
- Arquetipo: ${candidateA.archetype} (Puntaje: ${candidateA.archetypeScore})
- Aprobación: ${candidateA.metrics.approval} | Polarización: ${candidateA.metrics.polarization} | Confianza: ${candidateA.metrics.trust}

Datos del Adversario (${candidateB.name}):
- Arquetipo: ${candidateB.archetype} (Puntaje: ${candidateB.archetypeScore})
- Aprobación: ${candidateB.metrics.approval} | Polarización: ${candidateB.metrics.polarization} | Confianza: ${candidateB.metrics.trust}

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "verdict": "Resumen ejecutivo de 2 oraciones evaluando quién domina el escenario y por qué.",
  "strategicRecommendations": [
    "Directiva táctica accionable 1 (Ej: Aprovechar que B tiene baja confianza para lanzar notas en portales sobre transparencia...)",
    "Directiva táctica accionable 2",
    "Directiva táctica accionable 3"
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Gemini Compare Error:", error);
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
