"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AggiungiVeicoloModal from "./AggiungiVeicoloModal";
import { useAuth } from "@/context/AuthContext";
import { calcolaSalute, nomeVeicolo, type SaluteVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

/** Quante card veicolo restano visibili nella griglia compressa. */
const VISIBILI_COMPRESSA = 3;

const BADGE_SALUTE: Record<SaluteVeicolo, { icona: string; testo: string }> = {
  ok: { icona: "ti-circle-check", testo: "In buono stato" },
  attenzione: { icona: "ti-alert-triangle", testo: "Richiede attenzione" },
  urgente: { icona: "ti-alert-circle", testo: "Intervento urgente" },
};

interface GarageSectionProps {
  veicoli: VeicoloDettaglio[];
  espanso: boolean;
  onToggleEspanso: () => void;
  /** Ricarica i veicoli dopo un'aggiunta dal modale. */
  onGarageCambiato: () => Promise<void> | void;
}

function VeicoloCard({ veicolo, attivo, onClick }: {
  veicolo: VeicoloDettaglio;
  attivo: boolean;
  onClick: () => void;
}) {
  const salute = calcolaSalute(veicolo);
  const badge = BADGE_SALUTE[salute];

  return (
    <div
      className={`veicolo-card${attivo ? " attivo" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="veicolo-card-placeholder">
        <i className="ti ti-car" />
      </div>
      <span className="targa-pill">{veicolo.targa}</span>
      <p className="veicolo-card-nome">{nomeVeicolo(veicolo)}</p>
      {/* niente chilometraggio: il backend non gestisce il dato (nessun campo km) */}
      <span className={`badge-salute ${salute}`}>
        <i className={`ti ${badge.icona}`} />
        {badge.testo}
      </span>
    </div>
  );
}

/**
 * "Il mio garage": griglia responsive delle card veicolo (max 3 visibili,
 * il resto in un blocco espandibile animato) + card "Aggiungi un veicolo"
 * che apre il modale di ricerca targa.
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

  const cardAggiungi = (
    <div
      className="aggiungi-card"
      role="button"
      tabIndex={0}
      onClick={() => setModalAperto(true)}
      onKeyDown={(e) => e.key === "Enter" && setModalAperto(true)}
    >
      <div className="aggiungi-plus">
        <i className="ti ti-plus" />
      </div>
      <span className="aggiungi-label">Aggiungi un veicolo</span>
    </div>
  );

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

      <AggiungiVeicoloModal
        aperto={modalAperto}
        onChiudi={() => setModalAperto(false)}
        onAggiunto={onGarageCambiato}
      />
    </section>
  );
}
