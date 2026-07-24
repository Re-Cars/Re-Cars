"use client";

import Link from "next/link";

/**
 * Le tre card azione fisse in fondo alla homepage. Le destinazioni sono
 * volutamente identiche alle voci corrispondenti della Sidebar (vedi
 * commenti su ogni card e in Sidebar.tsx): tenerle allineate a mano.
 */
export default function AzioniRapide() {
  return (
    <section className="azioni-grid">
      {/* Stessa destinazione della voce sidebar "Storico interventi" (/storico-interventi) */}
      <Link href="/storico-interventi" className="azione-card">
        <div className="azione-icona">
          <i className="ti ti-history" />
        </div>
        <p className="azione-titolo">Storico interventi</p>
        <p className="azione-desc">Consulta e registra gli interventi dei tuoi veicoli</p>
      </Link>

      {/* Stessa destinazione della voce sidebar "Prenotazioni" (/prenotazioni) */}
      <Link href="/prenotazioni" className="azione-card">
        <div className="azione-icona">
          <i className="ti ti-calendar-event" />
        </div>
        <p className="azione-titolo">Prenota officina</p>
        <p className="azione-desc">Trova un&apos;officina e fissa un appuntamento</p>
      </Link>

      {/* Stessa destinazione delle card veicolo del garage (/info-veicolo) */}
      <Link href="/info-veicolo" className="azione-card">
        <div className="azione-icona">
          <i className="ti ti-file-description" />
        </div>
        <p className="azione-titolo">Scheda tecnica</p>
        <p className="azione-desc">Dati tecnici e mantenimento del veicolo attivo</p>
      </Link>
    </section>
  );
}
