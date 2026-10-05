import type { Metadata } from "next";

// titolo della scheda del browser: "Termini e privacy · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Termini e privacy" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
