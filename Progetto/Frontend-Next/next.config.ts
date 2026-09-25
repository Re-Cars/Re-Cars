import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // niente bottone "N" di Next in basso a sinistra durante `pnpm dev`:
  // copriva il sito. Gli errori di compilazione compaiono comunque a schermo.
  devIndicators: false,
};

export default nextConfig;
