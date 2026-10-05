import type { Metadata } from "next";

// titolo della scheda del browser: "Prenota · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Prenota" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
