"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { consumaGarageAnimation } from "@/lib/storage";
import type { VeicoloCompatto } from "@/lib/types";

interface VeicoloSwitcherProps {
  /** Su homepage il pill fluttua sopra le card circolari. */
  floating?: boolean;
}

/**
 * Pill del veicolo attivo (nome + targa) e switcher del garage:
 * dropdown con l'elenco dei veicoli, eliminazione con conferma e
 * bottone "Aggiungi veicolo" con il bordo conic-gradient animato.
 */
export default function VeicoloSwitcher({ floating = false }: VeicoloSwitcherProps) {
  const router = useRouter();
  const {
    veicoli,
    veicoloAttivo,
    selezionaVeicolo,
    eliminaVeicoloDalGarage,
    garageEffetto,
    consumaGarageEffetto,
    segnalaGarageEffetto,
  } = useAuth();

  const [aperto, setAperto] = useState(false);
  const [daEliminare, setDaEliminare] = useState<VeicoloCompatto | null>(null);
  const [animazioneBtn, setAnimazioneBtn] = useState<"" | "garage-pop" | "garage-delete">("");
  const rootRef = useRef<HTMLElement>(null);

  // chiusura al click fuori (pill + switcher)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // animazione "pop" quando si arriva dalla pagina cerca-veicolo dopo un'aggiunta
  useEffect(() => {
    if (consumaGarageAnimation()) {
      const timer = setTimeout(() => segnalaGarageEffetto("pop"), 300);
      return () => clearTimeout(timer);
    }
  }, [segnalaGarageEffetto]);

  // consumo degli effetti garage segnalati dal context (pop 3s / shake 0.6s)
  useEffect(() => {
    if (!garageEffetto) return;
    const classe = garageEffetto === "pop" ? "garage-pop" : "garage-delete";
    setAnimazioneBtn(classe);
    consumaGarageEffetto();
    const timer = setTimeout(() => setAnimazioneBtn(""), garageEffetto === "pop" ? 3000 : 600);
    return () => clearTimeout(timer);
  }, [garageEffetto, consumaGarageEffetto]);

  const iconaTipo = (tipo: VeicoloCompatto["tipo"]) =>
    tipo === "motorcycle" ? "fa-motorcycle" : "fa-car";

  const onClickPill = () => {
    // su schermi stretti pill e switcher sono un unico elemento cliccabile
    if (window.matchMedia("(max-width: 480px)").matches) {
      setAperto((v) => !v);
    }
  };

  const confermaElimina = async () => {
    if (!daEliminare) return;
    setDaEliminare(null);
    const ok = await eliminaVeicoloDalGarage(daEliminare.id);
    if (ok) setAperto(false);
  };

  return (
    <>
      <section
        ref={rootRef}
        className={`home-intro${floating ? " home-intro--floating" : ""}`}
      >
        <div className="home-intro-veicolo" onClick={onClickPill}>
          <i className={`fa-solid ${iconaTipo(veicoloAttivo?.tipo ?? "car")}`} />
          <span className="veicolo-nome">{veicoloAttivo?.nome ?? "Caricamento..."}</span>
          <span className="veicolo-sep">·</span>
          <span className="veicolo-targa">{veicoloAttivo?.targa ?? ""}</span>
        </div>

        <div className="veicolo-switcher">
          <button
            type="button"
            className={`switcher-btn${aperto ? " open" : ""} ${animazioneBtn}`.trim()}
            onClick={() => setAperto((v) => !v)}
          >
            <span>
              <i className="fa-solid fa-warehouse" />
              <span className="veicoli-counter">{veicoli.length > 0 ? veicoli.length : ""}</span>
            </span>
            <i className="fa-solid fa-chevron-down switcher-chevron" />
          </button>

          <div className={`switcher-dropdown${aperto ? " open" : ""}`}>
            {veicoli.map((v) => (
              <div
                key={v.id}
                className={`switcher-item${veicoloAttivo?.id === v.id ? " attivo" : ""}`}
                onClick={() => {
                  selezionaVeicolo(v.id);
                  setAperto(false);
                }}
              >
                <i className={`fa-solid ${iconaTipo(v.tipo)}`} />
                <span>{v.nome}</span>
                <span className="item-targa">{v.targa}</span>
                <button
                  type="button"
                  className="switcher-delete-btn"
                  title="Elimina veicolo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDaEliminare(v);
                  }}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}

            <div className="switcher-aggiungi">
              <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                <div className="switcher-aggiungi-btn-wrap">
                  <button
                    type="button"
                    className="switcher-aggiungi-btn"
                    onClick={() => router.push("/cerca-veicolo")}
                  >
                    <div className="switcher-plus-circle">
                      <i className="fa-solid fa-plus" />
                    </div>
                    Aggiungi veicolo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {daEliminare && (
        <div className="conferma-elimina-overlay" onClick={() => setDaEliminare(null)}>
          <div className="conferma-elimina-box" onClick={(e) => e.stopPropagation()}>
            <div className="conferma-elimina-icon">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <p className="conferma-elimina-title">Elimina veicolo</p>
            <p className="conferma-elimina-sub">
              Vuoi rimuovere <strong>{daEliminare.nome}</strong> dal tuo garage?
            </p>
            <div className="conferma-elimina-btns">
              <button
                type="button"
                className="conferma-btn-annulla"
                onClick={() => setDaEliminare(null)}
              >
                Annulla
              </button>
              <button type="button" className="conferma-btn-elimina" onClick={() => void confermaElimina()}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
