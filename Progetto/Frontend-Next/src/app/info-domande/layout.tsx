import type { Metadata } from "next";

// titolo della scheda del browser: "Info e domande · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Info e domande" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
