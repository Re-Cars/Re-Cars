"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getAbbonamento } from "@/lib/api";

/**
 * Pagina di ritorno dal checkout Stripe: legge il session_id dall'URL,
 * mostra la conferma e ricarica il piano abbonamento aggiornato dal
 * backend (l'attivazione vera avviene lato server via webhook).
 */
function ContenutoPagamento() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { utente, aggiornaUtente } = useAuth();
  const [pianoAggiornato, setPianoAggiornato] = useState<string | null>(null);

  useEffect(() => {
    if (!utente) return;
    let annullato = false;
    getAbbonamento(utente.id)
      .then((data) => {
        if (annullato) return;
        const piano = data.abbonamento?.[0]?.piano ?? "base";
        setPianoAggiornato(piano);
        aggiornaUtente({ ...utente, piano });
      })
      .catch((err) => console.error("Errore aggiornamento abbonamento:", err));
    return () => {
      annullato = true;
    };
    // si ricarica una volta per id utente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente?.id]);

  const nomiPiani: Record<string, string> = { base: "Base", premium: "Premium", pro: "Pro" };

  return (
    <div className="ps-wrap">
      <div className="ps-card">
        <div className="ps-icon-wrap">
          <div className="ps-icon-ring" />
          <div className="ps-icon-ring ps-icon-ring2" />
          <div className="ps-icon-circle">
            <i className="fa-solid fa-check" />
          </div>
        </div>

        <span className="ps-badge">
          <span className="ps-badge-dot" />
          {pianoAggiornato && pianoAggiornato !== "base"
            ? `Piano ${nomiPiani[pianoAggiornato] ?? pianoAggiornato} attivo`
            : "Abbonamento attivo"}
        </span>

        <span className="ps-brand">RE|CARS</span>

        <h1 className="ps-title">Pagamento completato!</h1>
        <p className="ps-sub">
          Il tuo abbonamento è stato attivato con successo. Riceverai una conferma via email a
          breve.
          {sessionId && (
            <>
              <br />
              <small>Rif. transazione: {sessionId.slice(0, 24)}…</small>
            </>
          )}
        </p>

        <div className="ps-divider" />

        <div className="ps-links">
          <Link href="/abbonamenti" className="ps-link">
            <i className="fa-solid fa-credit-card ps-link-icon" />
            Vedi abbonamento
          </Link>
          <span className="ps-link-sep">|</span>
          <Link href="/homepage" className="ps-link">
            <i className="fa-solid fa-house ps-link-icon" />
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoPage() {
  return (
    <>
      <header className="header">
        <div className="header-left" />
        <div className="header-center">
          <Link href="/homepage">
            <Image
              src="/Img/LOGO/solo-logo-C-e-O/SVG/logotipo.svg"
              alt="logo"
              width={50}
              height={50}
              className="header-logo-img"
            />
            <span className="header-brand">
              RE<span>|</span>CARS
            </span>
          </Link>
        </div>
        <div className="header-right" />
      </header>

      <Suspense fallback={null}>
        <ContenutoPagamento />
      </Suspense>
    </>
  );
}
