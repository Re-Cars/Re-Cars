"use client";

import { useEffect, useRef, useState } from "react";

import VeicoloChip, { isMoto } from "@/components/home/VeicoloChip";
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [aperta, onChiudi]);

  if (!aperta) return null;

  const q = query.trim().toLowerCase();
  const filtroAttivo = FILTRI.find((f) => f.id === filtro) ?? FILTRI[0];
  const risultati = veicoli
    .filter(filtroAttivo.test)
    .filter((v) => !q || `${v.marca ?? ""} ${v.modello ?? ""} ${v.targa}`.toLowerCase().includes(q));

  return (
    <div className="dash-overlay" onClick={(e) => e.target === e.currentTarget && onChiudi()}>
      <div className="dash-modal dash-modal--cerca" role="dialog" aria-modal="true" aria-labelledby="cerca-titolo">
        <div className="dash-modal-head">
          <h2 id="cerca-titolo" className="dash-title">
            <i className="ti ti-search" />
            Cerca nel garage
          </h2>
          <span className="dash-count">{veicoli.length}</span>
          <button type="button" className="dash-icon-btn" aria-label="Chiudi" onClick={onChiudi}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="dash-search">
          <i className="ti ti-search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per targa, marca o modello…"
          />
        </div>
        <div className="dash-filtri">
          {FILTRI.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`dash-fchip${filtro === f.id ? " on" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label} <small>{veicoli.filter(f.test).length}</small>
            </button>
          ))}
        </div>
        <div className="dash-modal-list">
          {risultati.map((v) => (
            <VeicoloChip
              key={v.id}
              veicolo={v}
              attivo={v.id === selezionatoId}
              onSeleziona={() => onSeleziona(v.id)}
            />
          ))}
          {risultati.length === 0 && (
            <p className="dash-garage-vuoto">Nessun veicolo corrisponde alla ricerca.</p>
          )}
        </div>
      </div>
    </div>
  );
}
