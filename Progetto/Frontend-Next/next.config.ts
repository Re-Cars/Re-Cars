import type { NextConfig } from "next";

/**
 * Backend NestJS (Render in produzione, localhost:3000 in sviluppo). Il
 * browser non lo chiama mai direttamente: passa da /api sul dominio del sito
 * (vedi src/lib/api.ts), così il cookie di sessione resta di prima parte.
 */
const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

if (!BACKEND) {
  throw new Error(
    "NEXT_PUBLIC_API_URL non è definita: impostala in .env.local (sviluppo) " +
      "o nelle Environment Variables del progetto Vercel (produzione).",
  );
}

const nextConfig: NextConfig = {
  // niente bottone "N" di Next in basso a sinistra durante `pnpm dev`:
  // copriva il sito. Gli errori di compilazione compaiono comunque a schermo.
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/:path*` }];
  },
};

export default nextConfig;
