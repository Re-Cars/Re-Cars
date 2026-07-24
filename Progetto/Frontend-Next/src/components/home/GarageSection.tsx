"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AggiungiVeicoloCard, VeicoloCard } from "./VeicoloCard";
import AggiungiVeicoloOverlay from "@/components/AggiungiVeicoloOverlay";
import { useAuth } from "@/context/AuthContext";
import type { VeicoloDettaglio } from "@/lib/types";

/** Quante card veicolo restano visibili nella griglia compressa. */
const VISIBILI_COMPRESSA = 3;

interface GarageSectionProps {
  veicoli: VeicoloDettaglio[];
  espanso: boolean;
  onToggleEspanso: () => void;
  /** Ricarica i veicoli dopo un'aggiunta dal modale. */
  onGarageCambiato: () => Promise<void> | void;
}

/**
 * "Il mio garage": griglia responsive delle card veicolo (max 3 visibili,
 * il resto in un blocco espandibile animato) + card "Aggiungi un veicolo"
 * che apre l'overlay di ricerca targa.
 */
export default function GarageSection({
  veicoli,
  espanso,
  onToggleEspanso,
  onGarageCambiato,
}: GarageSectionProps) {
  const router = useRouter();
  const { veicoloAttivo, selezionaVeicolo } = useAuth();
  const [modalAperto, setModalAperto] = useState(false);

  const visibili = veicoli.slice(0, VISIBILI_COMPRESSA);
  const extra = veicoli.slice(VISIBILI_COMPRESSA);

  const apriVeicolo = (v: VeicoloDettaglio) => {
    // la pagina info-veicolo lavora sul veicolo attivo: lo si seleziona
    // prima di navigare, l'id in query resta come riferimento esplicito
    selezionaVeicolo(v.id);
    router.push(`/info-veicolo?id=${v.id}`);
  };

  const cardAggiungi = <AggiungiVeicoloCard onClick={() => setModalAperto(true)} />;

  return (
    <section id="garage" className="hp-garage">
      <h2 className="hp-section-title">
        <i className="ti ti-car" />
        Il mio garage
      </h2>

      <div className="garage-grid">
        {visibili.map((v) => (
          <VeicoloCard
            key={v.id}
            veicolo={v}
            attivo={veicoloAttivo?.id === v.id}
            onClick={() => apriVeicolo(v)}
          />
        ))}
        {/* la card aggiungi chiude sempre la griglia compressa */}
        {extra.length === 0 && cardAggiungi}
      </div>

      {extra.length > 0 && (
        <>
          <div className={`garage-extra${espanso ? " open" : ""}`}>
            <div className="garage-extra-inner">
              <div className="garage-grid garage-grid-extra">
                {extra.map((v) => (
                  <VeicoloCard
                    key={v.id}
                    veicolo={v}
                    attivo={veicoloAttivo?.id === v.id}
                    onClick={() => apriVeicolo(v)}
                  />
                ))}
                {cardAggiungi}
              </div>
            </div>
          </div>
          <button type="button" className="garage-toggle-btn" onClick={onToggleEspanso}>
            <i className={`ti ti-chevron-down${espanso ? " ruotata" : ""}`} />
            {espanso ? "Mostra meno" : "Mostra tutti i veicoli"}
          </button>
        </>
      )}

      <AggiungiVeicoloOverlay
        aperto={modalAperto}
        onChiudi={() => setModalAperto(false)}
        onAggiunto={onGarageCambiato}
      />
    </section>
  );
}
