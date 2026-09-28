import type { MetadataRoute } from "next";

/**
 * Manifest della PWA: con questo e il service worker (public/sw.js) il sito
 * si può installare ("Aggiungi a schermata Home") e si apre a tutto schermo
 * come un'app, partendo dalla dashboard.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RE|CARS",
    short_name: "RE|CARS",
    description: "Gestione veicoli e prenotazione officine — Tu guida al resto pensiamo noi",
    lang: "it",
    start_url: "/homepage",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08082a",
    theme_color: "#141445",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
