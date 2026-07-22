"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Layout from "@/components/Layout";

interface CardCircolare {
  id: string;
  angolo: number;
  href: string;
  classe: string;
  icona: string;
  label: string;
}

/** Card disposte sul cerchio, stessi angoli di functions-app.js. */
const CARDS: CardCircolare[] = [
  { id: "hc1", angolo: -90, href: "/info-veicolo", classe: "card-veicolo", icona: "fa-car", label: "INFO VEICOLO" },
  { id: "hc2", angolo: -18, href: "/storico-interventi", classe: "card-storicointeventi", icona: "fa-calendar-check", label: "STORICO INTERVENTI" },
  { id: "hc3", angolo: 54, href: "/recensioni", classe: "card-recensioni", icona: "fa-star", label: "RECENSIONI" },
  { id: "hc4", angolo: 126, href: "/prenotazioni", classe: "card-prenotazioni", icona: "fa-wrench", label: "PRENOTA APPUNTAMENTO" },
  { id: "hc5", angolo: 198, href: "/problemi", classe: "card-problemi", icona: "fa-triangle-exclamation", label: "SEGNA PROBLEMI" },
];

/**
 * Homepage: card circolari attorno al bottone Cerca centrale con i
 * cerchi pulsanti, più il veicolo switcher fluttuante in alto.
 */
export default function HomePage() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [posizioni, setPosizioni] = useState<Record<string, { left: number; top: number }>>({});
  const [rivelate, setRivelate] = useState<Set<string>>(new Set());

  // calcola la posizione delle card sul cerchio; richiamata al load e al resize
  useEffect(() => {
    const posiziona = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const cx = scene.offsetWidth / 2;
      const cy = scene.offsetHeight / 2;
      const r = Math.min(cx, cy) * 0.8;
      const nuove: Record<string, { left: number; top: number }> = {};
      for (const card of CARDS) {
        const rad = (card.angolo * Math.PI) / 180;
        nuove[card.id] = { left: cx + Math.cos(rad) * r, top: cy + Math.sin(rad) * r };
      }
      setPosizioni(nuove);
    };

    posiziona();
    window.addEventListener("resize", posiziona);

    // reveal scaglionato (50ms + 100ms + 80ms per card, come il vanilla)
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        posiziona();
        CARDS.forEach((card, i) => {
          timers.push(
            setTimeout(() => {
              setRivelate((prev) => new Set(prev).add(card.id));
            }, 100 + i * 80),
          );
        });
      }, 50),
    );

    return () => {
      window.removeEventListener("resize", posiziona);
      timers.forEach(clearTimeout);
    };
  }, []);

  const renderCard = (card: CardCircolare) => {
    const pos = posizioni[card.id];
    return (
      <Link
        key={card.id}
        href={card.href}
        className={`home-card ${card.classe}${rivelate.has(card.id) ? " posizionata" : ""}`}
        style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : undefined}
      >
        <div className="home-card-icon">
          <i className={`fa-solid ${card.icona}`} />
        </div>
        <span>{card.label}</span>
      </Link>
    );
  };

  return (
    <Layout switcherFloating>
      <section className="home-cards-section">
        <div className="cards-scene" ref={sceneRef}>
          <div className="cards-ring" />
          <div className="cards-pulse" />
          <div className="cards-pulse cards-pulse2" />
          <div className="cards-pulse cards-pulse3" />
          <div className="cards-pulse cards-pulse4" />
          <div className="cards-pulse cards-pulse5" />

          {CARDS.map(renderCard)}

          <Link href="/cerca-veicolo" className="cards-center-btn">
            <i className="fa-solid fa-magnifying-glass" />
            <span>Cerca</span>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
