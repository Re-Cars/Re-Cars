"use client";

import { useEffect, useState } from "react";

import { isMoto } from "@/components/home/VeicoloChip";
import Overlay from "@/components/ui/Overlay";
import { nomeVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

interface EliminaVeicoloModalProps {
  veicolo: VeicoloDettaglio | null;
  onChiudi: () => void;
  onConferma: (id: number) => Promise<boolean>;
}

/**
 * Conferma di eliminazione di un veicolo. Il backend (VeicoloService.
 * eliminaVeicolo) cancella a cascata anche storico interventi e dati
 * tecnici: l'operazione non è reversibile, e la modale lo dice.
 */
export default function EliminaVeicoloModal({ veicolo, onChiudi, onConferma }: EliminaVeicoloModalProps) {
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (veicolo) setInCorso(false);
  }, [veicolo]);

  if (!veicolo) return null;
  const nome = nomeVeicolo(veicolo);
  const moto = isMoto(veicolo);

  return (
    <Overlay
      onChiudi={onChiudi}
      titolo={`Eliminare ${nome}?`}
      icona="ti-trash"
      larghezza={480}
      bloccato={inCorso}
      sottotitolo={
        <>
          Verranno eliminati anche i dati tecnici e <b>tutti gli interventi nello storico</b>{" "}
          di questo veicolo. L&apos;operazione non è reversibile.
        </>
      }
      piede={
        <>
          <span className="ov-nota" />
          <button type="button" className="btn-dash btn-dash-ghost" disabled={inCorso} onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="button"
            className="btn-dash btn-dash-danger"
            disabled={inCorso}
            onClick={async () => {
              setInCorso(true);
              const ok = await onConferma(veicolo.id);
              if (!ok) setInCorso(false);
            }}
          >
            <i className="ti ti-trash" />
            {inCorso ? "Eliminazione…" : "Elimina veicolo"}
          </button>
        </>
      }
    >
      <div className="dash-modal-vrow">
        <span className={`garage-chip-av tipo-${moto ? "moto" : "auto"}`}>
          <i className={`ti ${moto ? "ti-motorbike" : "ti-car"}`} />
        </span>
        <b>{nome}</b>
        <span className="targa-it targa-it--mini">
          <span className="targa-it-eu">I</span>
          <span className="targa-it-num">{veicolo.targa}</span>
        </span>
      </div>
    </Overlay>
  );
}
