import { Book, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ManualPage() {
  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
      .manual-layout { display: flex; max-width: 1440px; margin: 0 auto; flex-direction: row; }
      .manual-sidebar { width: 280px; border-right: 1px solid var(--glass-border); height: calc(100vh - 65px); position: sticky; top: 65px; padding: 2rem 1.5rem; overflow-y: auto; }
      .manual-content { flex: 1; padding: 3rem 4rem; max-width: 900px; }
      
      @media (max-width: 768px) {
        .manual-layout { flex-direction: column; }
        .manual-sidebar { width: 100%; height: auto; position: relative; top: 0; border-right: none; border-bottom: 1px solid var(--glass-border); padding: 1.5rem; }
        .manual-content { padding: 2rem 1.5rem; }
      }
    `}} />
    <div style={{ minHeight: "100vh", background: "transparent", position: "relative", zIndex: 1, color: "var(--text-primary)", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ 
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10, 14, 26, 0.8)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)", padding: "1rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ 
            display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-muted)", 
            textDecoration: "none", fontSize: "0.85rem", fontWeight: 500
          }}>
            <ChevronLeft size={16} /> Volver a Ojo Social
          </Link>
          <div style={{ width: "1px", height: "20px", background: "var(--glass-border)", display: "none" }} className="hide-mobile" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Book size={18} color="var(--accent-primary)" />
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: "1.1rem" }}>Manual Institucional</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="manual-layout">
        
        {/* Sidebar Nav */}
        <aside className="manual-sidebar">
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 700, marginBottom: "1rem" }}>
            Índice
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <li><a href="#intro" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: "0.9rem" }}>1. Introducción al Ecosistema</a></li>
            <li><a href="#glosario" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: "0.9rem" }}>2. Glosario de Métricas Base</a></li>
            <li><a href="#arquetipos" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: "0.9rem" }}>3. Guía de Arquetipos</a></li>
            <li><a href="#lab20" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: "0.9rem" }}>4. Laboratorio Avanzado 2.0</a></li>
            <li><a href="#casos" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: "0.9rem" }}>5. Casos de Uso (Consultoría)</a></li>
          </ul>
        </aside>

        {/* Content */}
        <main className="manual-content">
          
          <div id="intro" style={{ marginBottom: "4rem" }}>
            <h1 style={{ fontFamily: "Outfit", fontSize: "2.5rem", fontWeight: 900, marginBottom: "1rem" }}>
              Ojo Social <span className="text-gradient">Docs</span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Bienvenido al manual oficial de uso para equipos de consultoría política, comunicación gubernamental y análisis de crisis. Ojo Social utiliza IA generativa (modelos Gemini Pro y Llama-3 en redundancia) para extraer el pulso narrativo de la calle.
            </p>
          </div>

          <div id="glosario" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
              2. Glosario de Métricas Base
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <strong style={{ color: "var(--accent-primary)", fontSize: "1.1rem" }}>Movilización (0-100)</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.6 }}>Capacidad de la figura para transformar su discurso en acción real (marchas, votos, tendencias orgánicas). Un puntaje bajo indica "apatía" o desconexión.</p>
              </div>
              <div>
                <strong style={{ color: "var(--accent-primary)", fontSize: "1.1rem" }}>Resonancia (0-100)</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.6 }}>El impacto y volumen de retención de una idea. Si una figura habla y el tema domina la agenda 3 días seguidos, tiene alta resonancia.</p>
              </div>
              <div>
                <strong style={{ color: "var(--accent-primary)", fontSize: "1.1rem" }}>Polarización (0-100)</strong>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.6 }}>Nivel de fricción social. La IA está instruida para que, si un cliente baja de 40 puntos (apatía total), recomiende estrategias agresivas para volver a polarizar el debate.</p>
              </div>
            </div>
          </div>

          <div id="arquetipos" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
              3. Guía de Arquetipos Políticos
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Basado en la teoría narrativa, la IA encasilla a la figura en el rol que la sociedad le está asignando *en ese momento*.
            </p>
            <ul style={{ color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "1.5rem" }}>
              <li><strong>El Héroe:</strong> Salvador frente a la crisis. Demanda constante de victorias (no puede mostrar debilidad).</li>
              <li><strong>El Villano / Antihéroe:</strong> Disruptor del statu quo. Se alimenta de la polarización; su fuerza radica en tener enemigos claros.</li>
              <li><strong>El Sabio / Estadista:</strong> Voz de la razón. Conecta con el centro moderado. Se destruye rápidamente si comete errores de coherencia.</li>
              <li><strong>El Guardián:</strong> Protector del orden tradicional. Se asocia a figuras conservadoras o instituciones fuertes.</li>
              <li><strong>El Trickster:</strong> Astuto, impredecible. Superviviente del caos político (Ej: figuras pragmáticas que cambian de bando sin pagar costo).</li>
            </ul>
          </div>

          <div id="lab20" style={{ marginBottom: "4rem", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", padding: "2rem", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--accent-primary)" }}>
              4. Laboratorio Avanzado (PRO 2.0)
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Métricas exclusivas para suscriptores de Ojo Social Premium.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div style={{ paddingLeft: "1rem", borderLeft: "2px solid #f43f5e" }}>
                <strong style={{ color: "#f43f5e" }}>Disonancia Cognitiva:</strong> Mide la grieta entre lo que el político dice (relato) y lo que la calle siente. Si esta brecha supera el 60%, el riesgo de estallido mediático es inminente.
              </div>
              <div style={{ paddingLeft: "1rem", borderLeft: "2px solid #a855f7" }}>
                <strong style={{ color: "#a855f7" }}>Contagio Narrativo:</strong> Indica si un tema negativo confinado a redes sociales tiene potencial para saltar a la televisión abierta y diarios nacionales.
              </div>
              <div style={{ paddingLeft: "1rem", borderLeft: "2px solid #3b82f6" }}>
                <strong style={{ color: "#3b82f6" }}>Sincronía Emocional Federal:</strong> Cruce de datos que indica si el discurso en CABA tiene el mismo impacto en el Norte o en la Patagonia.
              </div>
            </div>
          </div>

          <div id="casos" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
              5. Casos de Uso de Consultoría
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong>Estrategia 1: Uso de Snapshots para Tracking.</strong> En lugar de hacer una medición mensual, guarde un "Snapshot" antes de que su candidato dé un discurso clave (Etiqueta: Pre-Debate) y otro a las 48 horas (Etiqueta: Post-Debate). Envíelos al Comparador para ver la varianza matemática en Disonancia Cognitiva.
            </p>
            <br/>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong>Estrategia 2: Inteligencia Competitiva.</strong> Busque al candidato opositor y envíelo al "Panel de Comparación" contra su cliente. Si el opositor tiene una "Fatiga" alta, la IA le recomendará ataques precisos sobre temas nuevos para agotarlo.
            </p>
          </div>

        </main>
      </div>
    </div>
    </>
  );
}
