import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";

import GestiApp from "@/components/pwa/GestiApp";
import RegistraServiceWorker from "@/components/pwa/RegistraServiceWorker";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import "@/styles/mobile.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RE|CARS",
  description: "Gestione veicoli e prenotazione officine — Tu guida al resto pensiamo noi",
  applicationName: "RE|CARS",
  // installata su iPhone: a tutto schermo, barra di stato sopra lo sfondo scuro
  appleWebApp: { capable: true, title: "RE|CARS", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#141445",
  // come un'app (Kilo): niente zoom; a tutto schermo sotto notch e barra
  // di stato, con gli spazi dati dai safe-area-inset
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Font Awesome: stesse icone (classi fa-*) del frontend vanilla */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
        {/* Tabler Icons (outline, classi ti ti-*): icone della nuova homepage */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css"
        />
      </head>
      <body className={inter.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <AuthProvider>{children}</AuthProvider>
          <RegistraServiceWorker />
          <GestiApp />
        </ThemeProvider>
      </body>
    </html>
  );
}
