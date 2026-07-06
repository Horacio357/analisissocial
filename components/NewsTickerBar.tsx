"use client";

import { useEffect, useState, useRef } from "react";
import { Rss, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  { id: "1", title: "Análisis político en Argentina: nuevas dinámicas en el escenario nacional", source: "Infobae", url: "https://infobae.com" },
  { id: "2", title: "El humor social ante las medidas económicas del gobierno", source: "La Nación", url: "https://lanacion.com.ar" },
  { id: "3", title: "Encuesta: cómo ven los argentinos el futuro del país", source: "Clarín", url: "https://clarin.com" },
  { id: "4", title: "Polarización política: un fenómeno que se intensifica en las provincias", source: "Perfil", url: "https://perfil.com" },
  { id: "5", title: "Redes sociales y opinión pública: el nuevo campo de batalla digital", source: "TN", url: "https://tn.com.ar" },
  { id: "6", title: "Figuras públicas bajo la lupa: los arquetipos que definen la narrativa argentina", source: "Cronista", url: "https://cronista.com" },
];

export default function NewsTickerBar() {
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [paused, setPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/news?q=Argentina+política+economía&lang=es&country=ar")
      .then(r => r.json())
      .then(data => {
        if (data.articles?.length > 0) {
          setNews(data.articles.slice(0, 10).map((a: {
            id: string; title: string; source: string; url: string;
          }) => ({ id: a.id, title: a.title, source: a.source, url: a.url })));
        }
      })
      .catch(() => {});
  }, []);

  const doubled = [...news, ...news];

  const handleNewsClick = (item: NewsItem, idx: number) => {
    if (item.url && item.url !== "#") {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
    setCurrentIndex(idx % news.length);
  };

  return (
    <div
      style={{
        background: "rgba(0, 212, 255, 0.05)",
        borderTop: "1px solid rgba(0, 212, 255, 0.1)",
        borderBottom: "1px solid rgba(0, 212, 255, 0.1)",
        padding: "0.55rem 0",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setCurrentIndex(null); }}
    >
      {/* Gradientes laterales */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"100px",
        background:"linear-gradient(90deg, var(--primary-900), transparent)", zIndex:10, pointerEvents:"none" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"100px",
        background:"linear-gradient(270deg, var(--primary-900), transparent)", zIndex:10, pointerEvents:"none" }} />

      {/* Badge LIVE */}
      <div style={{
        position:"absolute", left:"1rem", top:"50%", transform:"translateY(-50%)",
        display:"flex", alignItems:"center", gap:"0.4rem",
        zIndex:20, background:"var(--primary-900)", paddingRight:"0.75rem",
      }}>
        <span className="status-dot status-live" />
        <Rss size={11} color="var(--accent-primary)" />
        <span style={{ fontSize:"0.62rem", fontWeight:700, color:"var(--accent-primary)",
          textTransform:"uppercase", letterSpacing:"0.12em" }}>
          Noticias
        </span>
      </div>

      {/* Texto de pausa al hover */}
      {paused && (
        <div style={{
          position:"absolute", right:"1rem", top:"50%", transform:"translateY(-50%)",
          zIndex:20, display:"flex", alignItems:"center", gap:"0.35rem",
          background:"var(--primary-900)", paddingLeft:"0.5rem",
        }}>
          <span style={{ fontSize:"0.62rem", color:"var(--text-muted)" }}>⏸ pausado</span>
        </div>
      )}

      {/* Ticker */}
      <div
        ref={tickerRef}
        className="news-ticker-content"
        style={{
          paddingLeft:"140px",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {doubled.map((item, i) => {
          const realIdx = i % news.length;
          const isActive = currentIndex === realIdx;
          return (
            <button
              key={`${item.id}-${i}`}
              onClick={() => handleNewsClick(item, i)}
              title={`Abrir: ${item.title}`}
              style={{
                display:"inline-flex",
                alignItems:"center",
                gap:"0.5rem",
                background:"none",
                border:"none",
                color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                fontSize:"0.8rem",
                whiteSpace:"nowrap",
                cursor:"pointer",
                flexShrink:0,
                padding:"0 0.25rem",
                transition:"color 0.2s",
                textAlign:"left",
              }}
              onMouseEnter={e => { (e.currentTarget).style.color = "var(--accent-primary)"; }}
              onMouseLeave={e => {
                if (currentIndex !== realIdx)
                  (e.currentTarget).style.color = "var(--text-secondary)";
              }}
            >
              <span style={{
                color:"var(--accent-primary)", fontSize:"0.6rem", fontWeight:800,
                letterSpacing:"0.05em", padding:"0.1rem 0.35rem",
                background:"rgba(0,212,255,0.08)", borderRadius:"4px",
                border:"1px solid rgba(0,212,255,0.2)",
              }}>
                {item.source}
              </span>
              <span>{item.title}</span>
              <ExternalLink size={9} style={{ opacity:0.5, flexShrink:0 }} />
              <span style={{ color:"rgba(0,212,255,0.15)", margin:"0 1rem" }}>│</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
