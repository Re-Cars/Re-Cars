"use client";

import { useState } from "react";

import VeicoloInfoCard from "@/components/VeicoloInfoCard";
import AggiungiVeicoloOverlay from "@/components/AggiungiVeicoloOverlay";
import { useAuth } from "@/context/AuthContext";
import { calcolaSalute, nomeVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

interface GarageSectionProps {
  veicoli: VeicoloDettaglio[];
  /** Ricarica i veicoli dopo un'aggiunta dal modale. */
  onGarageCambiato: () => Promise<void> | void;
}

/**
 * "Il mio garage": rail verticale dei veicoli (stile switcher — chip
 * compatte con icona tipo-aware, targa e pallino di stato) affiancata alla
 * scheda tecnica completa del veicolo selezionato (VeicoloInfoCard in
 * versione compatta, senza il riquadro icona). La card "Aggiungi veicolo"
 * è sempre la prima voce della rail, mai nascosta né spostata: selezionare
 * un veicolo aggiorna il veicolo attivo globale (stesso usato da switcher,
 * storico interventi, prenotazioni), così il pannello di dettaglio resta
 * sempre coerente col resto del sito.
 */
export default function GarageSection({ veicoli, onGarageCambiato }: GarageSectionProps) {
  const { veicoloAttivo, selezionaVeicolo } = useAuth();
  const [modalAperto, setModalAperto] = useState(false);

  const selezionato = veicoli.find((v) => v.id === veicoloAttivo?.id) ?? veicoli[0] ?? null;

  return (
    <section id="garage" className="hp-garage">
      <h2 className="hp-section-title">
        <i className="ti ti-car" />
        Il mio garage
      </h2>

      <div className="garage-rail-layout">
        <div className="garage-rail">
          <button type="button" className="garage-rail-add" onClick={() => setModalAperto(true)}>
            <span className="garage-rail-add-icon">
              <i className="ti ti-plus" />
            </span>
            Aggiungi veicolo
          </button>

          {veicoli.map((v) => {
            const isMoto = (v.dati_generici[0]?.tipo_veicolo ?? "").toLowerCase() === "moto";
            const salute = calcolaSalute(v);
            const attivo = v.id === selezionato?.id;
            return (
              <button
                key={v.id}
                type="button"
                className={`garage-rail-chip${attivo ? " attivo" : ""}`}
                onClick={() => selezionaVeicolo(v.id)}
              >
                <span className={`garage-rail-chip-icon tipo-${isMoto ? "moto" : "auto"}`}>
                  <i className={`fa-solid ${isMoto ? "fa-motorcycle" : "fa-car"}`} />
                </span>
                <span className="garage-rail-chip-info">
                  <span className="garage-rail-chip-nome">{nomeVeicolo(v)}</span>
                  <span className="garage-rail-chip-targa">{v.targa}</span>
                </span>
                <span className={`garage-rail-chip-dot salute-${salute}`} />
              </button>
            );
          })}
        </div>

        <div className="garage-rail-detail">
          <VeicoloInfoCard veicolo={selezionato} compatto />
        </div>
      </div>

      <AggiungiVeicoloOverlay
        aperto={modalAperto}
        onChiudi={() => setModalAperto(false)}
        onAggiunto={onGarageCambiato}
      />
    </section>
  );
}
