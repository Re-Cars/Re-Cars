import type { Metadata } from "next";

// titolo della scheda del browser: "Account · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Account" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
