import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e1a",
};

export const metadata: Metadata = {
  title: "Proyecto Talos | Inteligencia Colectiva & Análisis Sociopolítico",
  description:
    "Plataforma avanzada de análisis de sentimiento e inteligencia sociopolítica. Monitorea el pulso social, arquetipos de personalidades y el mapa de calor emocional de Argentina en tiempo real.",
  keywords:
    "análisis social, inteligencia artificial, sentimiento, Argentina, política, personalidades públicas",
  authors: [{ name: "Proyecto Talos" }],
  openGraph: {
    title: "Proyecto Talos | Inteligencia Colectiva",
    description:
      "Monitorea el pulso social y los arquetipos de personalidades públicas en tiempo real",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
