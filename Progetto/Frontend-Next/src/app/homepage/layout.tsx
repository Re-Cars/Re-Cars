import type { Metadata } from "next";

// titolo della scheda del browser: "Home · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Home" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
