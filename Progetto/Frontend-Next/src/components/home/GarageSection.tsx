"use client";

import { useState } from "react";

import AggiungiVeicoloOverlay from "@/components/AggiungiVeicoloOverlay";
import CercaVeicoloModal from "@/components/home/CercaVeicoloModal";
import EliminaVeicoloModal from "@/components/home/EliminaVeicoloModal";
import VeicoloChip from "@/components/home/VeicoloChip";
import { useSfumaturaScroll } from "@/hooks/useSfumaturaScroll";
import type { VeicoloDettaglio } from "@/lib/types";

interface GarageSectionProps {
  veicoli: VeicoloDettaglio[];
  selezionatoId: number | null;
  onSeleziona: (id: number) => void;
  /** Ricarica i veicoli dopo un'aggiunta o un'eliminazione. */
  onGarageCambiato: () => Promise<void> | void;
  onElimina: (id: number) => Promise<boolean>;
}

/**
 * "Il mio garage" in dashboard: bottone "Aggiungi veicolo" sempre in cima,
 * lista di tutti i veicoli con scorrimento interno sempre attivo e, in
 * fondo, "Cerca veicolo" che apre la ricerca nel garage (solo ricerca: per
 * aggiungere si usa il bottone in cima).
 */
export default function GarageSection({
  veicoli,
  selezionatoId,
  onSeleziona,
  onGarageCambiato,
  onElimina,
}: GarageSectionProps) {
  const [aggiungiAperto, setAggiungiAperto] = useState(false);
  const [cercaAperta, setCercaAperta] = useState(false);
  const [daEliminare, setDaEliminare] = useState<VeicoloDettaglio | null>(null);
  const [listaRef, sfumatura] = useSfumaturaScroll<HTMLDivElement>(veicoli.length);

  return (
    <section id="garage" className="panel dash-garage" aria-label="Il mio garage">
      <div className="dash-garage-head">
        <h2 className="dash-title">
          <i className="ti ti-building-warehouse" />
          Il mio garage
        </h2>
        <span className="dash-count">{veicoli.length}</span>
      </div>

      <button type="button" className="dash-add-btn" onClick={() => setAggiungiAperto(true)}>
        <span className="dash-add-plus">
          <i className="ti ti-plus" />
        </span>
        Aggiungi veicolo
      </button>

      <div ref={listaRef} className={`dash-garage-list${sfumatura ? " sfuma" : ""}`}>
        {veicoli.map((v) => (
          <VeicoloChip
            key={v.id}
            veicolo={v}
            attivo={v.id === selezionatoId}
            onSeleziona={() => onSeleziona(v.id)}
            onElimina={() => setDaEliminare(v)}
          />
        ))}
        {veicoli.length === 0 && <p className="dash-garage-vuoto">Il garage è vuoto.</p>}
      </div>

      {veicoli.length > 0 && (
        <button type="button" className="dash-cerca-btn" onClick={() => setCercaAperta(true)}>
          <i className="ti ti-search" />
          Cerca veicolo
        </button>
      )}

      <AggiungiVeicoloOverlay
        aperto={aggiungiAperto}
        onChiudi={() => setAggiungiAperto(false)}
        onAggiunto={onGarageCambiato}
      />
      <CercaVeicoloModal
        aperta={cercaAperta}
        veicoli={veicoli}
        selezionatoId={selezionatoId}
        onChiudi={() => setCercaAperta(false)}
        onSeleziona={(id) => {
          onSeleziona(id);
          setCercaAperta(false);
        }}
      />
      <EliminaVeicoloModal
        veicolo={daEliminare}
        onChiudi={() => setDaEliminare(null)}
        onConferma={async (id) => {
          const ok = await onElimina(id);
          if (ok) setDaEliminare(null);
          return ok;
        }}
      />
    </section>
  );
}
