import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NEWSDATA_API_KEY;
const API_URL = process.env.NEWSDATA_API_URL || "https://newsdata.io/api/1/latest";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const language = searchParams.get("lang") || "es";
  const country = searchParams.get("country") || "ar";

  if (!API_KEY) {
    return NextResponse.json({ error: "API key no configurada" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      apikey: API_KEY,
      q: query,
      language,
      country,
      size: "10",
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      next: { revalidate: 300 }, // Cache 5 minutos
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("NewsData API error:", errorData);
      return NextResponse.json(
        { error: "Error al obtener noticias", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transformar y limpiar los datos
    const articles = (data.results || []).map((article: {
      article_id?: string;
      title?: string;
      source_name?: string;
      link?: string;
      pubDate?: string;
      description?: string;
      keywords?: string[];
      image_url?: string;
    }) => ({
      id: article.article_id || Math.random().toString(36),
      title: article.title || "Sin título",
      source: article.source_name || "Desconocido",
      url: article.link || "#",
      publishedAt: article.pubDate || new Date().toISOString(),
      description: article.description || "",
      keywords: article.keywords || [],
      imageUrl: article.image_url || null,
    }));

    return NextResponse.json({
      articles,
      totalResults: data.totalResults || articles.length,
      nextPage: data.nextPage || null,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
