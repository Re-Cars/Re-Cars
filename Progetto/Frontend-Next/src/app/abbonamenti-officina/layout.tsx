import type { Metadata } from "next";

// titolo della scheda del browser: "Abbonamenti · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Abbonamenti" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
