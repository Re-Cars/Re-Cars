"use client";

import Link from "next/link";

interface AzioniRapideProps {
  /** Spesa dell'anno in corso su tutto il garage (null finché non calcolata). */
  speseAnno: number | null;
}

/**
 * Le tre azioni rapide della dashboard. Le destinazioni coincidono con le
 * voci della Sidebar (tenerle allineate a mano): "Costi di gestione" apre
 * la sezione costi dello storico interventi.
 */
export default function AzioniRapide({ speseAnno }: AzioniRapideProps) {
  const anno = new Date().getFullYear();

  return (
    <nav className="dash-azioni" aria-label="Azioni rapide">
      <div className="dash-azioni-title">
        <i className="ti ti-bolt" />
        Azioni rapide
      </div>

      <Link href="/storico-interventi" className="dash-az">
        <span className="dash-az-ic"><i className="ti ti-history" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">Storico interventi</span>
          <span className="dash-az-d">Consulta e registra gli interventi dei tuoi veicoli</span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </Link>

      <Link href="/prenotazioni" className="dash-az">
        <span className="dash-az-ic"><i className="ti ti-calendar-event" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">Prenota officina</span>
          <span className="dash-az-d">Trova un&apos;officina e fissa un appuntamento</span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </Link>

      <Link href="/storico-interventi#costi" className="dash-az">
        <span className="dash-az-ic"><i className="ti ti-currency-euro" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">
            Costi di gestione
            {speseAnno !== null && (
              <span className="dash-az-kpi">
                € {speseAnno.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} nel {anno}
              </span>
            )}
          </span>
          <span className="dash-az-d">Spese per veicolo e per mese, dallo storico</span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </Link>
    </nav>
  );
}
