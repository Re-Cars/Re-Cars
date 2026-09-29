"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";

// Account e Abbonamenti stanno nel menu dell'avatar in alto a destra;
// "Contatti" del menu ☰ non ha ancora una pagina e resta fuori
const SCHEDE = [
  { href: "/homepage", icona: "ti-home", label: "Home" },
  { href: "/storico-interventi", icona: "ti-history", label: "Storico" },
  { href: "/prenotazioni", icona: "ti-calendar-event", label: "Prenota" },
  { href: "/info-domande", icona: "ti-help-circle", label: "Info" },
  { href: "/termini-privacy", icona: "ti-file-text", label: "Privacy" },
];

/**
 * Barra di navigazione in basso su telefono e app installata (sotto i
 * 720px), nello stile di Kilo: pillola di vetro flottante e una capsula che
 * scivola sulla voce attiva. Si può anche far scorrere il dito lungo la
 * barra: la capsula segue il dito e la pagina si apre quando lo si solleva.
 * Su telefono sostituisce il menu ☰ (nascosto in styles/mobile.css).
 */
export default function BarraSchede() {
  const pathname = usePathname();
  const router = useRouter();
  const barraRef = useRef<HTMLElement>(null);
  const [anteprima, setAnteprima] = useState<number | null>(null);

  const attiva = SCHEDE.findIndex((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  const mostrata = anteprima ?? attiva;

  const indiceA = (x: number) => {
    const r = barraRef.current!.getBoundingClientRect();
    const i = Math.floor(((x - r.left) / r.width) * SCHEDE.length);
    return Math.min(Math.max(i, 0), SCHEDE.length - 1);
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
      style={{ "--i": mostrata, "--n": SCHEDE.length } as CSSProperties}
      onTouchStart={(e) => setAnteprima(indiceA(e.touches[0].clientX))}
      onTouchMove={(e) => segui(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        // il tocco lo gestisce la barra: niente clic doppio sul link
        e.preventDefault();
        if (anteprima !== null && anteprima !== attiva) router.push(SCHEDE[anteprima].href);
        setAnteprima(null);
      }}
      onTouchCancel={() => setAnteprima(null)}
    >
      {mostrata >= 0 && <span className="barra-capsula" aria-hidden="true" />}
      {SCHEDE.map((s, i) => (
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
