"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type TransitionEvent } from "react";

import { AggiungiVeicoloCard, VeicoloCard } from "./VeicoloCard";
import AggiungiVeicoloOverlay from "@/components/AggiungiVeicoloOverlay";
import { useAuth } from "@/context/AuthContext";
import type { VeicoloDettaglio } from "@/lib/types";

/**
 * Quante card veicolo restano visibili nella griglia compressa: 2, perché
 * il terzo slot è sempre occupato dalla card "Aggiungi un veicolo".
 */
const VISIBILI_COMPRESSA = 2;

interface GarageSectionProps {
  veicoli: VeicoloDettaglio[];
  espanso: boolean;
  onToggleEspanso: () => void;
  /** Ricarica i veicoli dopo un'aggiunta dal modale. */
  onGarageCambiato: () => Promise<void> | void;
}

/**
 * "Il mio garage": griglia responsive delle card veicolo (2 visibili + card
 * "Aggiungi un veicolo" sempre in 3ª posizione, il resto in un blocco
 * espandibile animato).
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
  /**
   * true solo a pannello extra completamente aperto: serve a togliere
   * l'overflow:hidden (necessario durante l'animazione grid-template-rows)
   * che altrimenti taglierebbe il tilt 3D delle card al passaggio del mouse.
   */
  const [extraAssestato, setExtraAssestato] = useState(false);

  // in chiusura il clipping deve tornare subito, non a transizione finita
  useEffect(() => {
    if (!espanso) setExtraAssestato(false);
  }, [espanso]);

  const onExtraTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName === "grid-template-rows" && espanso) setExtraAssestato(true);
  };

  const visibili = veicoli.slice(0, VISIBILI_COMPRESSA);
  const extra = veicoli.slice(VISIBILI_COMPRESSA);

  const apriVeicolo = (v: VeicoloDettaglio) => {
    // la pagina info-veicolo lavora sul veicolo attivo: lo si seleziona
    // prima di navigare, l'id in query resta come riferimento esplicito
    selezionaVeicolo(v.id);
    router.push(`/info-veicolo?id=${v.id}`);
  };

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
        {/* posizione fissa e prevedibile: sempre il 3° slot della griglia */}
        <AggiungiVeicoloCard onClick={() => setModalAperto(true)} />
      </div>

      {extra.length > 0 && (
        <>
          <div
            className={`garage-extra${espanso ? " open" : ""}`}
            onTransitionEnd={onExtraTransitionEnd}
          >
            <div className={`garage-extra-inner${extraAssestato ? " garage-extra-inner--assestato" : ""}`}>
              <div className="garage-grid garage-grid-extra">
                {extra.map((v) => (
                  <VeicoloCard
                    key={v.id}
                    veicolo={v}
                    attivo={veicoloAttivo?.id === v.id}
                    onClick={() => apriVeicolo(v)}
                  />
                ))}
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
