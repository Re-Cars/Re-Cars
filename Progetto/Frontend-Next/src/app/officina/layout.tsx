import type { Metadata } from "next";

// titolo della scheda del browser: "Dashboard officina · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Dashboard officina" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
