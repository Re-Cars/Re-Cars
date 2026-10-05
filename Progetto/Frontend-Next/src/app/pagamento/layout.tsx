import type { Metadata } from "next";

// titolo della scheda del browser: "Pagamento · RE|CARS" (modello in app/layout.tsx)
export const metadata: Metadata = { title: "Pagamento" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
