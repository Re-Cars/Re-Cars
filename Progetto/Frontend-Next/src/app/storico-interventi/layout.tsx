import type { Metadata } from "next";

// titolo della scheda del browser: "Storico interventi · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Storico interventi" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
