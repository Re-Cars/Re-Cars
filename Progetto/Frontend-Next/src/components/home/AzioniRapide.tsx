"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CarburanteModal, {
  carburanteDelVeicolo,
  ETICHETTA_CARBURANTE,
  posizione,
  prezzoIt,
} from "@/components/home/CarburanteModal";
import { getCarburantiVicini } from "@/lib/api";
import { nomeVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

interface AzioniRapideProps {
  /** Spesa dell'anno in corso su tutto il garage (null finché non calcolata). */
  speseAnno: number | null;
  /** Veicolo nella scheda: decide il carburante da cercare. */
  veicolo: VeicoloDettaglio | null;
}

/**
 * Le tre azioni rapide della dashboard: storico (con la spesa dell'anno),
 * prenotazioni e carburante più economico vicino. Le prime due coincidono
 * con le voci della Sidebar (tenerle allineate a mano).
 */
export default function AzioniRapide({ speseAnno, veicolo }: AzioniRapideProps) {
  const anno = new Date().getFullYear();
  const [carburanteAperto, setCarburanteAperto] = useState(false);
  const [prezzoMigliore, setPrezzoMigliore] = useState<number | null>(null);

  const alimentazione = veicolo?.dati_generici[0]?.alimentazione;
  const carburante = carburanteDelVeicolo(alimentazione);

  // se la posizione è già stata concessa, la card mostra subito il prezzo più
  // basso entro 5 km; altrimenti la si chiede solo al tocco (niente popup all'avvio)
  useEffect(() => {
    setPrezzoMigliore(null);
    if (!carburante || !navigator.permissions) return;
    let annullato = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then(async (permesso) => {
        if (permesso.state !== "granted") return;
        const { lat, lng } = await posizione();
        const r = await getCarburantiVicini(lat, lng, carburante, 5);
        if (!annullato && r.impianti[0]) setPrezzoMigliore(r.impianti[0].prezzo);
      })
      .catch(() => undefined);
    return () => {
      annullato = true;
    };
  }, [carburante]);

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
          <span className="dash-az-d">
            {speseAnno !== null
              ? `Spesi nel ${anno}: € ${speseAnno.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "Interventi e costi di gestione dei tuoi veicoli"}
          </span>
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

      <button type="button" className="dash-az" onClick={() => setCarburanteAperto(true)}>
        <span className="dash-az-ic"><i className="ti ti-gas-station" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">
            Carburante vicino
            {prezzoMigliore !== null && carburante && (
              <span className="dash-az-kpi">
                {prezzoIt(prezzoMigliore)} {carburante === "metano" ? "€/kg" : "€/l"}
              </span>
            )}
          </span>
          <span className="dash-az-d">
            {carburante
              ? `${ETICHETTA_CARBURANTE[carburante]} · il prezzo più basso vicino a te`
              : "Distributori vicino a te, con i prezzi del giorno"}
          </span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </button>

      {carburanteAperto && (
        <CarburanteModal
          onChiudi={() => setCarburanteAperto(false)}
          iniziale={carburante}
          nomeVeicolo={veicolo ? nomeVeicolo(veicolo) : undefined}
        />
      )}
    </nav>
  );
}
