import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const provinceCache = new Map<string, { data: unknown; expiresAt: number }>();

const ARGENTINE_GOVERNORS: Record<string, string> = {
  "buenos-aires-ciudad": "Jorge Macri (Jefe de Gobierno)",
  "buenos-aires": "Axel Kicillof",
  "catamarca": "Raúl Jalil",
  "chaco": "Leandro Zdero",
  "chubut": "Ignacio Torres",
  "cordoba": "Martín Llaryora",
  "corrientes": "Gustavo Valdés",
  "entre-rios": "Rogelio Frigerio",
  "formosa": "Gildo Insfrán",
  "jujuy": "Carlos Sadir",
  "la-pampa": "Sergio Ziliotto",
  "la-rioja": "Ricardo Quintela",
  "mendoza": "Alfredo Cornejo",
  "misiones": "Hugo Passalacqua",
  "neuquen": "Rolando Figueroa",
  "rio-negro": "Alberto Weretilneck",
  "salta": "Gustavo Sáenz",
  "san-juan": "Marcelo Orrego",
  "san-luis": "Claudio Poggi",
  "santa-cruz": "Claudio Vidal",
  "santa-fe": "Maximiliano Pullaro",
  "santiago-del-estero": "Gerardo Zamora",
  "tierra-del-fuego": "Gustavo Melella",
  "tucuman": "Osvaldo Jaldo",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, provinceName, provinceId, nationalSentiment, nationalSummary, category } = body;

    if (!topic || !provinceName) {
      return NextResponse.json({ error: "Se requieren topic y provinceName" }, { status: 400 });
    }

    const cacheKey = `${topic}_${provinceId}`;
    const cached = provinceCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ ...cached.data, fromCache: true });
    }

    const governor = ARGENTINE_GOVERNORS[provinceId] || "desconocido";

    const prompt = `Sos el analista de inteligencia territorial más profundo de Argentina. Tu tarea es explicar con precisión quirúrgica cómo percibe la provincia de ${provinceName} el tema "${topic}" ${category ? "(categoría: " + category + ")" : ""}.

CONTEXTO TERRITORIAL DE ${provinceName}:
- Gobernador actual: ${governor} (es obligatorio referenciar la gestión de ${governor} y cómo influye en la opinión pública local sobre este tema).

CONTEXTO NACIONAL:
- Tema analizado: "${topic}"
- Sentimiento promedio nacional: ${Math.round(((nationalSentiment || 0) + 1) / 2 * 100)}% positivo
- Resumen nacional: "${(nationalSummary || "Sin datos").slice(0, 300)}"

REGLAS ABSOLUTAS:
1. Explicá con hechos concretos y reales por qué ${provinceName} percibe "${topic}" de una manera específica, citando políticas locales de ${governor}.
2. Mencioná y analizá el impacto de la gestión de ${governor} y la situación económica de la provincia.
3. Comparar con el promedio nacional — ¿Está por encima o por debajo y por qué?
4. PROHIBIDO: Frases genéricas que sirvan para cualquier provincia. Todo debe ser específico de ${provinceName}.
5. El summary debe tener MÍNIMO 4 oraciones densas en información territorial real.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "summary": "Análisis de 4-5 oraciones sobre cómo y por qué ${provinceName} percibe este tema. Con gobernador, datos locales y comparativa nacional.",
  "sentiment": <número entre -1.0 y 1.0 representando sentimiento local de ${provinceName}>,
  "vsNational": <diferencia en puntos porcentuales vs promedio nacional, puede ser negativo>,
  "rank": <posición de ${provinceName} de 1 a 24 en ranking nacional sobre este tema, 1=más positivo>,
  "localFactors": [
    "Factor local específico 1 de ${provinceName}",
    "Factor local específico 2",
    "Factor local específico 3",
    "Factor local específico 4"
  ],
  "emotionalBreakdown": {
    "fear": <0-100>,
    "anger": <0-100>,
    "hope": <0-100>,
    "pride": <0-100>,
    "fatigue": <0-100>
  },
  "keyIssues": ["Tema clave local 1", "Tema clave local 2", "Tema clave local 3"],
  "historicalContext": "1-2 oraciones sobre el contexto histórico o político de ${provinceName} que explica su postura."
}`;

    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in Gemini response");
        const parsed = JSON.parse(jsonMatch[0]);
        const data = { ...parsed, aiPowered: true, engine: "gemini" };
        provinceCache.set(cacheKey, { data, expiresAt: Date.now() + 2 * 60 * 60 * 1000 });
        return NextResponse.json(data);
      } catch (geminiErr) {
        console.error("Gemini province error, trying fallback:", geminiErr);
      }
    }

    // Fallback Grok (xAI)
    const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (XAI_API_KEY) {
      try {
        console.log("Attempting Grok (xAI) province fallback...");
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
            const data = { ...parsed, aiPowered: true, engine: "grok" };
            provinceCache.set(cacheKey, { data, expiresAt: Date.now() + 2 * 60 * 60 * 1000 });
            return NextResponse.json(data);
          }
        } else {
          console.error(`Grok province API error: ${grokRes.status} ${grokRes.statusText}`);
        }
      } catch (grokErr) {
        console.error("Grok province error:", grokErr);
      }
    }

    if (GROQ_API_KEY) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500
          })
        });
        if (!groqRes.ok) throw new Error(`Groq error: ${groqRes.status}`);
        const groqData = await groqRes.json();
        const text = groqData.choices[0].message.content.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in Groq response");
        const parsed = JSON.parse(jsonMatch[0]);
        const data = { ...parsed, aiPowered: true, engine: "groq" };
        provinceCache.set(cacheKey, { data, expiresAt: Date.now() + 2 * 60 * 60 * 1000 });
        return NextResponse.json(data);
      } catch (groqErr) {
        console.error("Groq province error:", groqErr);
      }
    }

    return NextResponse.json({
      summary: `No se pudo obtener el análisis de ${provinceName} en este momento. Reintentá en unos segundos.`,
      sentiment: nationalSentiment || 0,
      vsNational: 0,
      rank: 12,
      localFactors: ["Motor de IA temporalmente saturado. Reintentá en 30 segundos."],
      emotionalBreakdown: { fear: 50, anger: 30, hope: 40, pride: 35, fatigue: 45 },
      keyIssues: [topic],
      historicalContext: "Análisis no disponible temporalmente.",
      aiPowered: false
    });

  } catch (error: any) {
    console.error("Province API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
