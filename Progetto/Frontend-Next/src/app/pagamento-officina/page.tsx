"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { getProfiloOfficina } from "@/lib/api";

/**
 * Ritorno dal checkout Stripe per l'officina: conferma visiva e refresh
 * del profilo (l'attivazione vera avviene lato server via webhook).
 */
function ContenutoPagamentoOfficina() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    getProfiloOfficina().catch((err) =>
      console.error("Errore aggiornamento abbonamento officina:", err),
    );
  }, []);

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
          Abbonamento attivo
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
          <Link href="/abbonamenti-officina" className="ps-link">
            <i className="fa-solid fa-credit-card ps-link-icon" />
            Vedi abbonamento
          </Link>
          <span className="ps-link-sep">|</span>
          <Link href="/officina" className="ps-link">
            <i className="fa-solid fa-house ps-link-icon" />
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PagamentoOfficinaPage() {
  return (
    <>
      <header className="header">
        <div className="header-left" />
        <div className="header-center">
          <Link href="/officina">
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
        <ContenutoPagamentoOfficina />
      </Suspense>
    </>
  );
}
