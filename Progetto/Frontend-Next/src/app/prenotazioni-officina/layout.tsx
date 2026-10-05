import type { Metadata } from "next";

// titolo della scheda del browser: "Prenotazioni · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Prenotazioni" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
