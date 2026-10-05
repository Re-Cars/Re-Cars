import type { Metadata } from "next";

// titolo della scheda del browser: "Info veicolo · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Info veicolo" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
