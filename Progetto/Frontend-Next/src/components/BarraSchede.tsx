"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";

// Account e Abbonamenti stanno nel menu dell'avatar in alto a destra;
// "Contatti" del menu ☰ non ha ancora una pagina e resta fuori
export interface Scheda {
  href: string;
  icona: string;
  label: string;
}

const SCHEDE_UTENTE: Scheda[] = [
  { href: "/homepage", icona: "ti-home", label: "Home" },
  { href: "/storico-interventi", icona: "ti-history", label: "Storico" },
  { href: "/prenotazioni", icona: "ti-calendar-event", label: "Prenota" },
  { href: "/info-domande", icona: "ti-help-circle", label: "Info" },
  { href: "/termini-privacy", icona: "ti-file-text", label: "Privacy" },
];

/** Le sezioni dell'officina (components/officina/OfficinaLayout). */
export const SCHEDE_OFFICINA: Scheda[] = [
  { href: "/officina", icona: "ti-layout-dashboard", label: "Home" },
  { href: "/officina-agenda", icona: "ti-calendar-event", label: "Agenda" },
  { href: "/prenotazioni-officina", icona: "ti-list-details", label: "Prenotazioni" },
  { href: "/profilo-officina", icona: "ti-building-store", label: "Profilo" },
  { href: "/abbonamenti-officina", icona: "ti-crown", label: "Piano" },
];

/**
 * Barra di navigazione in basso su telefono e app installata (sotto i
 * 720px), nello stile di Kilo: pillola di vetro flottante e una capsula che
 * scivola sulla voce attiva. Si può anche far scorrere il dito lungo la
 * barra: la capsula segue il dito e la pagina si apre quando lo si solleva.
 * Su telefono sostituisce il menu ☰ (nascosto in styles/mobile.css).
 * `schede`: di default quelle dell'utente, SCHEDE_OFFICINA per l'officina.
 */
export default function BarraSchede({ schede = SCHEDE_UTENTE }: { schede?: Scheda[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const barraRef = useRef<HTMLElement>(null);
  const [anteprima, setAnteprima] = useState<number | null>(null);

  const attiva = schede.findIndex((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  const mostrata = anteprima ?? attiva;

  const indiceA = (x: number) => {
    const r = barraRef.current!.getBoundingClientRect();
    const i = Math.floor(((x - r.left) / r.width) * schede.length);
    return Math.min(Math.max(i, 0), schede.length - 1);
  };

  const segui = (x: number) => {
    const i = indiceA(x);
    if (i !== mostrata) navigator.vibrate?.(8);
    setAnteprima(i);
  };

  return (
    <nav
      ref={barraRef}
      className="barra-schede"
      aria-label="Navigazione principale"
      style={{ "--i": mostrata, "--n": schede.length } as CSSProperties}
      onTouchStart={(e) => setAnteprima(indiceA(e.touches[0].clientX))}
      onTouchMove={(e) => segui(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        // il tocco lo gestisce la barra: niente clic doppio sul link
        e.preventDefault();
        if (anteprima !== null && anteprima !== attiva) router.push(schede[anteprima].href);
        setAnteprima(null);
      }}
      onTouchCancel={() => setAnteprima(null)}
    >
      {mostrata >= 0 && <span className="barra-capsula" aria-hidden="true" />}
      {schede.map((s, i) => (
        <Link
          key={s.href}
          href={s.href}
          className={i === mostrata ? "on" : ""}
          aria-current={i === attiva ? "page" : undefined}
        >
          <i className={`ti ${s.icona}`} />
          <span>{s.label}</span>
        </Link>
      ))}
    </nav>
  );
}
