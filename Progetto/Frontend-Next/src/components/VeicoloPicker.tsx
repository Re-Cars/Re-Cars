"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";

/**
 * Selettore del veicolo attivo dentro l'hero delle pagine che lavorano su
 * un solo veicolo (storico interventi, info veicolo). Sostituisce le due
 * pill del vecchio VeicoloSwitcher globale: agisce sullo stesso veicolo
 * attivo del context (selezionaVeicolo), quindi resta coerente con la
 * dashboard.
 */
export default function VeicoloPicker() {
  const { veicoli, veicoloAttivo, selezionaVeicolo } = useAuth();
  const [aperto, setAperto] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aperto) return;
    setQuery("");
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setAperto(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [aperto]);

  if (!veicoloAttivo) return null;

  const q = query.trim().toLowerCase();
  const filtrati = veicoli.filter((v) => !q || `${v.nome} ${v.targa}`.toLowerCase().includes(q));
  const icona = (tipo: string) => (tipo === "motorcycle" ? "ti-motorbike" : "ti-car");
  const classeTipo = (tipo: string) => (tipo === "motorcycle" ? "tipo-moto" : "tipo-auto");

  return (
    <div ref={rootRef} className="vpick">
      <button
        type="button"
        className="vpick-btn"
        aria-haspopup="listbox"
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        <span className={`garage-chip-av ${classeTipo(veicoloAttivo.tipo)}`}>
          <i className={`ti ${icona(veicoloAttivo.tipo)}`} />
        </span>
        <span className="vpick-txt">
          <b>{veicoloAttivo.nome || veicoloAttivo.targa}</b>
          <span>{veicoloAttivo.targa}</span>
        </span>
        <i className="ti ti-chevron-down" />
      </button>

      {aperto && (
        <div className="vpick-menu" role="listbox">
          {veicoli.length > 5 && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca veicolo…"
            />
          )}
          {filtrati.map((v) => (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={v.id === veicoloAttivo.id}
              className={`vpick-opt${v.id === veicoloAttivo.id ? " on" : ""}`}
              onClick={() => {
                selezionaVeicolo(v.id);
                setAperto(false);
              }}
            >
              <span className={`garage-chip-av ${classeTipo(v.tipo)}`}>
                <i className={`ti ${icona(v.tipo)}`} />
              </span>
              <span className="vpick-txt">
                <b>{v.nome || v.targa}</b>
                <span>{v.targa}</span>
              </span>
              {v.id === veicoloAttivo.id && <i className="ti ti-circle-check vpick-ok" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
