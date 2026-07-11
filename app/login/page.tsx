"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: "error" | "success" } | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "¡Inicio de sesión exitoso! Redirigiendo...", type: "success" });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Revisá tu email para confirmar la cuenta.", type: "success" });
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div className="glass-card" style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "Outfit", fontSize: "2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Proyecto Talos <span style={{ color: "var(--accent-primary)" }}>PRO</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Iniciá sesión para acceder a herramientas avanzadas.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                width: "100%",
                padding: "0.8rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "0.8rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                outline: "none"
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              background: message.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
              color: message.type === "error" ? "#ef4444" : "#10b981",
              border: `1px solid ${message.type === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}`
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.8rem",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-primary)",
              color: "white",
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "1rem"
            }}
          >
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.8rem",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Crear cuenta nueva
          </button>
        </form>
      </div>
    </div>
  );
}
