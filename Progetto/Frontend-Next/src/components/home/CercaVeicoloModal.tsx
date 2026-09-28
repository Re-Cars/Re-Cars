"use client";

import { useEffect, useRef, useState } from "react";

import VeicoloChip, { isMoto } from "@/components/home/VeicoloChip";
import Overlay from "@/components/ui/Overlay";
import { calcolaSalute } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

type Filtro = "tutti" | "auto" | "moto" | "monitorare";

const FILTRI: { id: Filtro; label: string; test: (v: VeicoloDettaglio) => boolean }[] = [
  { id: "tutti", label: "Tutti", test: () => true },
  { id: "auto", label: "Auto", test: (v) => !isMoto(v) },
  { id: "moto", label: "Moto", test: (v) => isMoto(v) },
  { id: "monitorare", label: "Da monitorare", test: (v) => calcolaSalute(v) !== "ok" },
];

interface CercaVeicoloModalProps {
  aperta: boolean;
  veicoli: VeicoloDettaglio[];
  selezionatoId: number | null;
  onChiudi: () => void;
  onSeleziona: (id: number) => void;
}

/** Finestra centrale di ricerca nel proprio garage (targa, marca, modello + filtri). */
export default function CercaVeicoloModal({
  aperta,
  veicoli,
  selezionatoId,
  onChiudi,
  onSeleziona,
}: CercaVeicoloModalProps) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aperta) return;
    setQuery("");
    setFiltro("tutti");
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [aperta]);

  if (!aperta) return null;

  const q = query.trim().toLowerCase();
  const filtroAttivo = FILTRI.find((f) => f.id === filtro) ?? FILTRI[0];
  const risultati = veicoli
    .filter(filtroAttivo.test)
    .filter((v) => !q || `${v.marca ?? ""} ${v.modello ?? ""} ${v.targa}`.toLowerCase().includes(q));

  return (
    <Overlay onChiudi={onChiudi} titolo="Cerca nel garage" icona="ti-search" larghezza={520}>
      <input
        ref={inputRef}
        className="ov-in dash-cerca-in"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca per targa, marca o modello…"
        aria-label="Cerca nel garage"
      />
      <div className="ov-seg chips dash-cerca-filtri">
        {FILTRI.map((f) => (
          <button key={f.id} type="button" className={filtro === f.id ? "on" : ""} onClick={() => setFiltro(f.id)}>
            {f.label} <small>{veicoli.filter(f.test).length}</small>
          </button>
        ))}
      </div>
      <div className="dash-modal-list">
        {risultati.map((v) => (
          <VeicoloChip key={v.id} veicolo={v} attivo={v.id === selezionatoId} onSeleziona={() => onSeleziona(v.id)} />
        ))}
        {risultati.length === 0 && <p className="dash-garage-vuoto">Nessun veicolo corrisponde alla ricerca.</p>}
      </div>
    </Overlay>
  );
}
