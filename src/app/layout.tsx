import type { Metadata, Viewport } from "next";
import AplicarTema from "@/components/AplicarTema";
import RegistrarSW from "@/components/RegistrarSW";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tribu Fit",
  description: "Entrena en tribu. Rutinas, retos y seguimiento personalizado.",
  appleWebApp: { capable: true, title: "Tribu Fit", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema antes de pintar para que no parpadee. Lee tf_tema: "auto" (por defecto), "claro" u "oscuro".
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tf_tema");t=t?JSON.parse(t):"auto";var d=t==="oscuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">{children}<RegistrarSW /><AplicarTema /></body>
    </html>
  );
}
