const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export interface YouTubeComment {
  author: string;
  text: string;
  likes: number;
  publishedAt: string;
}

/**
 * Busca los videos más recientes y relevantes sobre la figura y extrae sus top comentarios.
 */
export async function fetchYouTubeComments(query: string): Promise<YouTubeComment[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn("No YOUTUBE_API_KEY found, skipping YouTube extraction.");
    return [];
  }

  try {
    // 1. Buscar los 3 videos más relevantes de noticias/política en Argentina
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.append("part", "snippet");
    searchUrl.searchParams.append("q", `${query} argentina politica`);
    searchUrl.searchParams.append("type", "video");
    searchUrl.searchParams.append("order", "relevance");
    searchUrl.searchParams.append("relevanceLanguage", "es");
    searchUrl.searchParams.append("regionCode", "AR");
    searchUrl.searchParams.append("maxResults", "3");
    searchUrl.searchParams.append("publishedAfter", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 7 días
    searchUrl.searchParams.append("key", YOUTUBE_API_KEY);

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId);
    let allComments: YouTubeComment[] = [];

    // 2. Extraer comentarios de cada video
    for (const videoId of videoIds) {
      const commentsUrl = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      commentsUrl.searchParams.append("part", "snippet");
      commentsUrl.searchParams.append("videoId", videoId);
      commentsUrl.searchParams.append("order", "relevance"); // Los más likeados primero
      commentsUrl.searchParams.append("maxResults", "15"); // Top 15 por video
      commentsUrl.searchParams.append("key", YOUTUBE_API_KEY);

      const commentsRes = await fetch(commentsUrl.toString());
      if (!commentsRes.ok) continue; // Si los comentarios están desactivados, saltamos
      
      const commentsData = await commentsRes.json();
      
      if (commentsData.items) {
        const parsedComments = commentsData.items.map((item: any) => {
          const comment = item.snippet.topLevelComment.snippet;
          return {
            author: comment.authorDisplayName,
            text: comment.textOriginal,
            likes: comment.likeCount,
            publishedAt: comment.publishedAt,
          };
        });
        allComments = [...allComments, ...parsedComments];
      }
    }

    // 3. Ordenar todos los comentarios extraídos por cantidad de likes y quedarnos con los 30 mejores
    allComments.sort((a, b) => b.likes - a.likes);
    return allComments.slice(0, 30);

  } catch (error) {
    console.error("Error en YouTube API:", error);
    return [];
  }
}
