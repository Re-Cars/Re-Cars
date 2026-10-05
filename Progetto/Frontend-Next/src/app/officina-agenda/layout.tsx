import type { Metadata } from "next";

// titolo della scheda del browser: "Agenda · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Agenda" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
