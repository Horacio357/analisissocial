"use client";

import { useState, useCallback } from "react";
import { Eye, Zap, Globe, Users, Star, GitCompare } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PersonalityCard from "@/components/PersonalityCard";
import HeatMapArgentina from "@/components/HeatMapArgentina";
import SocialPulse from "@/components/SocialPulse";
import NewsTickerBar from "@/components/NewsTickerBar";
import PersonalityComparator from "@/components/PersonalityComparator";
import NarrativasEmergentes from "@/components/NarrativasEmergentes";
import Top20Ranking from "@/components/Top20Ranking";
import UserDashboard from "@/components/UserDashboard";
import ProTools from "@/components/ProTools";
import { TOP_20_PERSONALITIES } from "@/lib/top20";
import { PersonalityAnalysis } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { MOCK_PROVINCE_SENTIMENTS, MOCK_PERSONALITIES } from "@/lib/types";
import { ARCHETYPE_CONFIG } from "@/lib/utils";

export default function HomePage() {
  const [currentAnalysis, setCurrentAnalysis] = useState<PersonalityAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const handleResult = async (data: PersonalityAnalysis) => {
    setCurrentAnalysis(data);
    setIsAnalyzing(false);

    // Si hay usuario logueado, guardar el análisis en su historial
    if (user) {
      await supabase.from("saved_analyses").insert({
        user_id: user.id,
        personality_name: data.name,
        analysis_data: data
      });
    }

    // Scroll a los resultados
    setTimeout(() => {
      document.getElementById("analysis-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleReanalyze = useCallback(async (name: string) => {
    setIsAnalyzing(true);
    try {
      await fetch(`/api/analyze?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      const res = await fetch(`/api/analyze?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentAnalysis(data);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

      {/* ─── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(10, 14, 26, 0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "0 1.5rem",
      }}>
        <div style={{
          maxWidth: "1440px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0,212,255,0.3)",
            }}>
              <Eye size={18} color="#0a0e1a" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontFamily: "Outfit", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Ojo Social
              </span>
              <span style={{
                display: "block",
                fontSize: "0.6rem",
                color: "var(--accent-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginTop: "-2px",
              }}>
                Inteligencia Colectiva
              </span>
            </div>
          </div>

          {/* Nav links - Desktop */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="nav-desktop">
            {[
              { label: "Dashboard", href: "#dashboard" },
              { label: "Análisis", href: "#analysis-section" },
              { label: "Comparar", href: "#comparador" },
              { label: "Mapa", href: "#mapa" },
              { label: "Acerca de", href: "#about" },
            ].map(item => (
              <a key={item.label} href={item.href} style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}>
                {item.label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className="btn-premium" onClick={() => setShowProModal(true)} style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
              <Star size={13} /> Premium
            </button>
          </div>
        </div>
      </nav>

      {/* ─── NEWS TICKER ─────────────────────────────────────────────────── */}
      <NewsTickerBar />

      <main className="main-container" style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <UserDashboard onSelectAnalysis={setCurrentAnalysis} />

        {/* ─── HERO SECTION ─────────────────────────────────────────────────── */}
        <section id="dashboard" style={{ paddingTop: "1rem" }}>
          {/* Tagline */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 1rem",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: "100px",
              fontSize: "0.75rem",
              color: "var(--accent-primary)",
              fontWeight: 600,
              marginBottom: "1.5rem",
              animation: "fadeInUp 0.5s ease both",
            }}>
              <span className="status-dot status-live" />
              Monitoreo en tiempo real · Argentina
            </div>

            <h1 style={{
              fontFamily: "Outfit",
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: "1.25rem",
              animation: "fadeInUp 0.6s ease 0.1s both",
            }}>
              El <span className="text-gradient">Pulso Social</span>
              <br />
              de Argentina
            </h1>

            <p style={{
              fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
              animation: "fadeInUp 0.6s ease 0.2s both",
            }}>
              Analizá personalidades públicas, medí el humor social y explorá el mapa de calor emocional de Argentina en tiempo real, impulsado por IA.
            </p>

            {/* Search Bar */}
            <div style={{ animation: "fadeInUp 0.6s ease 0.3s both" }}>
              <SearchBar onResult={handleResult} onLoading={setIsAnalyzing} />
            </div>
          </div>

          {/* ─── DASHBOARD GRID ─────────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr 300px",
            gap: "1.5rem",
            alignItems: "start",
            animation: "fadeInUp 0.7s ease 0.4s both",
          }}>

            {/* Columna izquierda: Pulso Social */}
            <div>
              <SocialPulse />
            </div>

            {/* Columna central: Mapa de Calor */}
            <div id="mapa" className="glass-card">
              <HeatMapArgentina
                provinceData={currentAnalysis?.provinceData || MOCK_PROVINCE_SENTIMENTS}
                personalityName={currentAnalysis?.name}
              />
            </div>

            {/* Columna derecha: Arquetipos del ecosistema */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div className="section-label">Arquetipos Activos</div>
                <h3 style={{ fontFamily: "Outfit", fontSize: "1rem", marginBottom: "0.75rem" }}>
                  Narrativa Colectiva
                </h3>
              </div>

              {Object.entries(ARCHETYPE_CONFIG).map(([key, conf]) => {
                const personality = TOP_20_PERSONALITIES.find(p => p.archetype === key);
                return (
                  <div key={key} className="glass-card" style={{
                    padding: "0.875rem",
                    border: `1px solid ${conf.color}20`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: personality ? "pointer" : "default",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => personality && setCurrentAnalysis(personality)}
                  onMouseEnter={e => { if (personality) (e.currentTarget as HTMLElement).style.borderColor = `${conf.color}40`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${conf.color}20`; }}
                  >
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: `${conf.color}15`,
                      border: `1px solid ${conf.color}35`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      flexShrink: 0,
                    }}>
                      {conf.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "0.9rem", color: conf.color }}>
                        {conf.label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {personality ? personality.name : "Sin datos"}
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: "0.25rem", lineHeight: 1.3, opacity: 0.8 }}>
                        {conf.description}
                      </div>
                    </div>
                    {personality && (
                      <div style={{ fontSize: "1rem", fontFamily: "Outfit", fontWeight: 800, color: "var(--text-secondary)" }}>
                        {personality.metrics.resonance}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ marginTop: "1rem" }}>
                <NarrativasEmergentes />
              </div>
            </div>
          </div>

          {/* ─── TOP 20 RANKING ─────────────────────────────────────────── */}
          <div style={{ animation: "fadeInUp 0.7s ease 0.5s both" }}>
            <Top20Ranking onSelectPersonality={setCurrentAnalysis} />
          </div>

        </section>

      {/* ─── ANALYSIS RESULTS ─────────────────────────────────────────────── */}
      <section id="analysis-section" style={{ padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto" }}>

          {isAnalyzing && (
            <div style={{
              textAlign: "center",
              padding: "4rem 2rem",
              animation: "fadeIn 0.3s ease both",
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                border: "3px solid var(--glass-border)",
                borderTop: "3px solid var(--accent-primary)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1rem",
              }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
                Analizando personalidad con IA...
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                Procesando noticias, calculando arquetipo y sentimiento por provincia
              </p>
            </div>
          )}

          {currentAnalysis && !isAnalyzing && (
            <div style={{ animation: "fadeInUp 0.5s ease both" }}>
              <ProTools targetId="pdf-report-container" reportName={currentAnalysis.name} />
              
              <div id="pdf-report-container" style={{ padding: "1rem", background: "var(--bg-base)", borderRadius: "var(--radius-lg)" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div className="section-label" style={{ justifyContent: "center" }}>Análisis Completo</div>
                <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 800 }}>
                  Perfil de <span className="text-gradient">{currentAnalysis.name}</span>
                </h2>
              </div>

              <div className="responsive-grid-2" style={{
                gap: "1.5rem",
                maxWidth: "1100px",
                margin: "0 auto",
              }}>
                <PersonalityCard
                  analysis={currentAnalysis}
                  onReanalyze={handleReanalyze}
                />
                <div className="glass-card">
                  <HeatMapArgentina
                    provinceData={currentAnalysis.provinceData}
                    personalityName={currentAnalysis.name}
                  />
                  {/* Noticias recientes */}
                  {currentAnalysis.topNews.length > 0 && (
                    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--glass-border)" }}>
                      <div className="section-label" style={{ marginBottom: "0.75rem" }}>Noticias Recientes</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {currentAnalysis.topNews.slice(0, 4).map((news, i) => (
                          <a
                            key={i}
                            href={news.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "0.6rem",
                              background: "rgba(255,255,255,0.02)",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              textDecoration: "none",
                              display: "block",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,212,255,0.04)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                          >
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", lineHeight: 1.4 }}>
                              {news.title}
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.68rem", color: "var(--accent-primary)" }}>{news.source}</span>
                              <span style={{
                                fontSize: "0.65rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                background: news.sentiment > 0.1 ? "rgba(16,185,129,0.1)" : news.sentiment < -0.1 ? "rgba(239,68,68,0.1)" : "rgba(107,114,128,0.1)",
                                color: news.sentiment > 0.1 ? "#34d399" : news.sentiment < -0.1 ? "#f87171" : "var(--text-muted)",
                              }}>
                                {news.sentiment > 0.1 ? "😊" : news.sentiment < -0.1 ? "😤" : "😐"} {news.sentiment > 0.1 ? "Positivo" : news.sentiment < -0.1 ? "Negativo" : "Neutro"}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Estado inicial: mostrar personalidades predefinidas */}
          {!currentAnalysis && !isAnalyzing && (
            <div style={{ animation: "fadeInUp 0.5s ease 0.5s both" }}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div className="section-label" style={{ justifyContent: "center" }}>Perfiles Recientes</div>
                <h2 style={{ fontFamily: "Outfit", fontSize: "1.5rem", fontWeight: 700 }}>
                  Personalidades Analizadas
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                  Hacé clic para ver el análisis completo
                </p>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "1.5rem",
                maxWidth: "1100px",
                margin: "0 auto",
              }}>
                {MOCK_PERSONALITIES.map((p, i) => (
                  <div
                    key={p.id}
                    className={`glass-card delay-${(i + 1) * 100}`}
                    style={{
                      cursor: "pointer",
                      border: `1px solid ${ARCHETYPE_CONFIG[p.archetype].color}20`,
                      animation: `fadeInUp 0.5s ease ${0.1 * i}s both`,
                    }}
                    onClick={() => setCurrentAnalysis(p)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: `${ARCHETYPE_CONFIG[p.archetype].color}15`,
                        border: `1px solid ${ARCHETYPE_CONFIG[p.archetype].color}35`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}>
                        {ARCHETYPE_CONFIG[p.archetype].emoji}
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "Outfit", fontSize: "1rem", fontWeight: 700 }}>{p.name}</h3>
                        <span className={`badge badge-${p.archetype}`} style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem" }}>
                          {ARCHETYPE_CONFIG[p.archetype].label}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {p.summary.slice(0, 100)}...
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      {[
                        { label: "Aprobación", val: p.metrics.approval, color: "#34d399" },
                        { label: "Polarización", val: p.metrics.polarization, color: "#f97316" },
                        { label: "Resonancia", val: p.metrics.resonance, color: "var(--accent-primary)" },
                      ].map(m => (
                        <div key={m.label} style={{
                          flex: 1,
                          minWidth: "80px",
                          padding: "0.4rem 0.5rem",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "6px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "1rem", fontFamily: "Outfit", fontWeight: 800, color: m.color }}>{m.val}</div>
                          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── COMPARADOR DE PERSONALIDADES ────────────────────────────────────── */}
      <section id="comparador" style={{ padding: "2rem 1.5rem", borderTop: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div className="section-label" style={{ justifyContent: "center" }}>
              <GitCompare size={12} /> Nueva Herramienta
            </div>
            <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 800 }}>
              Comparador de <span className="text-gradient">Personalidades</span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
              Radar doble · Métricas cara a cara · Mapa territorial comparativo
            </p>
          </div>
          <PersonalityComparator />
        </div>
      </section>

      {/* ─── FEATURES SECTION ─────────────────────────────────────────────── */}
      <section id="about" style={{ padding: "4rem 1.5rem", borderTop: "1px solid var(--glass-border)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="section-label" style={{ justifyContent: "center" }}>Plataforma</div>
            <h2 style={{ fontFamily: "Outfit", fontSize: "2rem", fontWeight: 800 }}>
              Inteligencia <span className="text-gradient">Sociopolítica</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", maxWidth: "500px", margin: "0.5rem auto 0" }}>
              Herramientas avanzadas para comprender la narrativa colectiva argentina
            </p>
          </div>

          <div className="grid-3" style={{ gap: "1.25rem" }}>
            {[
              {
                icon: <Zap size={24} color="var(--accent-primary)" />,
                title: "Análisis en Tiempo Real",
                desc: "Procesamiento continuo de noticias y redes sociales para capturar el pulso de la opinión pública al instante.",
                color: "var(--accent-primary)",
              },
              {
                icon: <Globe size={24} color="#8b5cf6" />,
                title: "Mapa de Calor Territorial",
                desc: "Visualización geográfica del humor social por provincia. Identifica focos de descontento y zonas de consenso.",
                color: "#8b5cf6",
              },
              {
                icon: <Users size={24} color="#f59e0b" />,
                title: "Arquetipado Sociológico",
                desc: "Sistema propietario que clasifica personalidades en arquetipos (Héroe, Villano, Sabio) basado en la narrativa colectiva.",
                color: "#f59e0b",
              },
            ].map((feat, i) => (
              <div key={i} className="glass-card" style={{ textAlign: "center", border: `1px solid ${feat.color}20` }}>
                <div style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: `${feat.color}12`,
                  border: `1px solid ${feat.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontFamily: "Outfit", fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--glass-border)",
        padding: "2rem 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Eye size={14} color="var(--accent-primary)" />
          <span style={{ fontFamily: "Outfit", fontWeight: 700, color: "var(--text-secondary)" }}>Ojo Social</span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Ecosistema de Inteligencia Colectiva · Análisis Sociopolítico Argentina
        </p>
      </footer>

      {/* Modal Premium Info */}
      {showProModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)",
        }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "450px", margin: "1rem", position: "relative", padding: "2rem" }}>
            <button
              onClick={() => setShowProModal(false)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)",
                borderRadius: "8px", padding: "0.3rem", cursor: "pointer", color: "var(--text-muted)",
              }}
            >
              X
            </button>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <Star size={32} color="#f59e0b" style={{ margin: "0 auto 1rem" }} />
              <h2 style={{ fontFamily: "Outfit", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
                ¡Ya tenés acceso <span className="text-gradient-warm">Premium</span>!
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Estás navegando en la versión PRO. Podés generar reportes ejecutivos en <b>PDF de alta resolución</b> o enviarlos por <b>Email</b> a tus clientes en un click.
              </p>
            </div>
            <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "8px", padding: "1rem", fontSize: "0.85rem", color: "var(--text-primary)" }}>
              <p style={{ marginBottom: "0.5rem" }}><b>¿Cómo usarlas?</b></p>
              <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-secondary)" }}>
                <li style={{ marginBottom: "0.3rem" }}>Buscá o seleccioná a un político.</li>
                <li>Hacé clic en los botones de "Descargar PDF" o "Enviar por Email" arriba de su perfil.</li>
              </ol>
            </div>
            <button
              onClick={() => setShowProModal(false)}
              style={{
                width: "100%", marginTop: "1.5rem", padding: "0.75rem",
                background: "var(--accent-primary)", color: "#000", border: "none",
                borderRadius: "8px", fontWeight: 700, cursor: "pointer",
              }}
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
