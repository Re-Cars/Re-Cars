import type { Metadata } from "next";

// titolo della scheda del browser: "Registrazione · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Registrazione" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
