"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { getVeicolo } from "@/lib/api";
import type { VeicoloCompatto } from "@/lib/types";

interface DettagliRiga {
  descrizione: string;
  bolloOk: boolean;
  rcaOk: boolean;
}

/**
 * Elenco veicoli registrati: riga per veicolo con targa, tipo · anno,
 * badge Bollo/RCA e azioni (info veicolo, elimina).
 */
export default function VeicoliPage() {
  const router = useRouter();
  const { veicoli, veicoloAttivo, selezionaVeicolo, eliminaVeicoloDalGarage } = useAuth();
  const [dettagli, setDettagli] = useState<Record<number, DettagliRiga>>({});
  const [daEliminare, setDaEliminare] = useState<VeicoloCompatto | null>(null);

  // dettagli per riga (tipo, anno, stato bollo/RCA) come nel vanilla
  useEffect(() => {
    let annullato = false;
    const carica = async () => {
      const risultati = await Promise.allSettled(veicoli.map((v) => getVeicolo(v.id)));
      if (annullato) return;
      const nuovi: Record<number, DettagliRiga> = {};
      risultati.forEach((r, i) => {
        if (r.status !== "fulfilled") return;
        const dg = r.value.dati_generici[0] ?? {};
        const ds = r.value.dati_specifici[0] ?? {};
        const anno = ds.dataimmatricolazione
          ? new Date(ds.dataimmatricolazione).getFullYear()
          : "-";
        nuovi[veicoli[i].id] = {
          descrizione: `${dg.tipo_veicolo ?? "Autovettura"} · ${anno}`,
          bolloOk: Boolean(ds.isbolloattivo),
          rcaOk: Boolean(ds.isinsured),
        };
      });
      setDettagli(nuovi);
    };
    if (veicoli.length > 0) void carica();
    return () => {
      annullato = true;
    };
  }, [veicoli]);

  const vaiAInfoVeicolo = (id: number) => {
    selezionaVeicolo(id);
    router.push("/info-veicolo");
  };

  const confermaElimina = async () => {
    if (!daEliminare) return;
    setDaEliminare(null);
    await eliminaVeicoloDalGarage(daEliminare.id);
  };

  return (
    <Layout breadcrumb="I miei veicoli">
      <section className="vl-dashboard">
        <div className="vl-section-card">
          <div className="vl-section-bar">
            <i className="fa-solid fa-car" />
            <span>Veicoli registrati</span>
          </div>
          <div className="vl-section-body">
            {veicoli.length === 0 ? (
              <div className="vl-empty">
                <i className="fa-solid fa-car-side" />
                Nessun veicolo registrato.
                <br />
                Aggiungi il tuo primo veicolo per iniziare.
              </div>
            ) : (
              veicoli.map((v, i) => {
                const det = dettagli[v.id];
                return (
                  <div
                    key={v.id}
                    className={`vl-veicolo-row${veicoloAttivo?.id === v.id ? " attivo" : ""}`}
                    style={{ animationDelay: `${i * 0.07}s` }}
                    onClick={() => selezionaVeicolo(v.id)}
                  >
                    <div className="vl-icon">
                      <i className={`fa-solid ${v.tipo === "motorcycle" ? "fa-motorcycle" : "fa-car"}`} />
                    </div>
                    <div className="vl-info">
                      <div className="vl-nome">{v.nome}</div>
                      <div className="vl-meta">
                        <span className="vl-targa">{v.targa}</span>
                        <span className="vl-tipo">{det?.descrizione ?? "Caricamento..."}</span>
                      </div>
                    </div>
                    <div className="vl-stato">
                      {det && (
                        <>
                          <span className={`vl-badge ${det.bolloOk ? "ok" : "ko"}`}>
                            <i className={`fa-solid ${det.bolloOk ? "fa-circle-check" : "fa-circle-xmark"}`} />{" "}
                            Bollo
                          </span>
                          <span className={`vl-badge ${det.rcaOk ? "ok" : "ko"}`}>
                            <i className="fa-solid fa-shield-halved" /> RCA
                          </span>
                        </>
                      )}
                    </div>
                    <div className="vl-actions">
                      <button
                        type="button"
                        className="vl-icon-btn"
                        title="Info veicolo"
                        onClick={(e) => {
                          e.stopPropagation();
                          vaiAInfoVeicolo(v.id);
                        }}
                      >
                        <i className="fa-solid fa-circle-info" />
                      </button>
                      <button
                        type="button"
                        className="vl-icon-btn del"
                        title="Elimina veicolo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDaEliminare(v);
                        }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="vl-aggiungi-wrap">
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
              <button type="button" className="conferma-btn-annulla" onClick={() => setDaEliminare(null)}>
                Annulla
              </button>
              <button type="button" className="conferma-btn-elimina" onClick={() => void confermaElimina()}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
