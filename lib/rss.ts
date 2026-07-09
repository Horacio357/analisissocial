import Parser from "rss-parser";

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
});

const RSS_FEEDS = [
  { name: "Clarín", url: "https://www.clarin.com/rss/lo-ultimo/" },
  { name: "Infobae", url: "https://www.infobae.com/argentina/feed/" },
  { name: "La Nación", url: "https://servicios.lanacion.com.ar/herramientas/rss/origen=2" },
  { name: "Perfil", url: "https://www.perfil.com/feed" },
  { name: "Página/12", url: "https://www.pagina12.com.ar/rss/portada.xml" }
];

export interface RSSArticle {
  title: string;
  source_name: string;
  link: string;
  pubDate: string;
  description?: string;
}

/**
 * Escanea los feeds RSS principales y filtra aquellos artículos que coincidan con la query
 */
export async function fetchArgentineRSS(query: string = ""): Promise<RSSArticle[]> {
  const queryLower = query.toLowerCase().replace(/["']/g, ''); // Limpiar comillas
  const queryTerms = queryLower.split(" ").filter(t => t.length > 2); // Buscar por términos importantes

  const promises = RSS_FEEDS.map(async (feed) => {
    try {
      const feedData = await parser.parseURL(feed.url);
      
      let items = feedData.items;

      // Si hay una query, filtramos. Si no (ej. trending topics globales), devolvemos todos.
      if (queryTerms.length > 0) {
        items = items.filter(item => {
          const textToSearch = `${item.title || ""} ${item.contentSnippet || ""} ${item.content || ""}`.toLowerCase();
          // Requerimos que al menos el término principal (apellido) esté presente, o todos los términos
          // Para ser laxos, si la persona es "Javier Milei", con que diga "Milei" alcanza.
          return queryTerms.some(term => textToSearch.includes(term));
        });
      }

      return items.map(item => ({
        title: item.title || "Sin título",
        source_name: feed.name,
        link: item.link || "",
        pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
        description: item.contentSnippet || item.content || ""
      }));
    } catch (error) {
      console.error(`Error leyendo RSS de ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(promises);
  
  // Aplanar el array de arrays y ordenar por fecha más reciente
  const allArticles = results.flat().sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return allArticles;
}
