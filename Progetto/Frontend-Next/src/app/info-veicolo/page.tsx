"use client";

import { useEffect, useState, type MouseEvent } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { getVeicolo } from "@/lib/api";
import type { VeicoloDettaglio } from "@/lib/types";

type StatoMantenimento = "attiva" | "scaduta";

/**
 * Info veicolo: hero con nome/targa/tipo/anno, caratteristiche tecniche
 * e stato mantenimento (bollo, assicurazione) del veicolo attivo.
 * Cambia veicolo dallo switcher e i dati si ricaricano.
 */
export default function InfoVeicoloPage() {
  const { veicoloAttivo, gestisci401, selezionaVeicolo } = useAuth();
  const [dettaglio, setDettaglio] = useState<VeicoloDettaglio | null>(null);

  // le card garage della homepage passano ?id=: si allinea il veicolo attivo
  // (letto da window.location per evitare il Suspense richiesto da useSearchParams)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("id");
    const id = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isNaN(id)) selezionaVeicolo(id);
  }, [selezionaVeicolo]);

  useEffect(() => {
    if (!veicoloAttivo) return;
    let annullato = false;
    getVeicolo(veicoloAttivo.id)
      .then((data) => {
        if (!annullato) setDettaglio(data);
      })
      .catch((err) => {
        if (!gestisci401(err)) console.error("Errore nel caricamento info veicolo", err);
      });
    return () => {
      annullato = true;
    };
  }, [veicoloAttivo, gestisci401]);

  const dg = dettaglio?.dati_generici[0] ?? {};
  const ds = dettaglio?.dati_specifici[0] ?? {};

  const nomeVeicolo =
    `${dettaglio?.marca ?? ""} ${dettaglio?.modello ?? ""}`.trim() || "Veicolo Attivo";
  const isMoto = (dg.tipo_veicolo ?? "").toLowerCase() === "moto";
  const iconaVeicolo = isMoto ? "fa-motorcycle" : "fa-car";

  const statoBollo: StatoMantenimento = ds.datascadenzabollo && ds.isbolloattivo ? "attiva" : "scaduta";
  const statoRca: StatoMantenimento = ds.datascadenzarca && ds.isinsured ? "attiva" : "scaduta";

  const dataBollo = ds.datascadenzabollo
    ? `scade il ${new Date(ds.datascadenzabollo).toLocaleDateString("it-IT")}`
    : "Dato non disponibile";
  const dataRca = ds.datascadenzarca
    ? `scade il ${new Date(ds.datascadenzarca).toLocaleDateString("it-IT")}`
    : "Dato non disponibile";

  // tilt 3D leggero delle card (replica di initInfoVeicoloTilt)
  const onTilt = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(1200px) rotateX(${(0.5 - py) * 4}deg) rotateY(${(px - 0.5) * 4}deg) translateY(-6px)`;
  };
  const resetTilt = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <Layout breadcrumb="Info Veicolo">
      <section className="iv-dashboard">
        {/* Hero veicolo */}
        <div className="iv-section-card iv-hero-card" onMouseMove={onTilt} onMouseLeave={resetTilt}>
          <div className="iv-section-bar">
            <i className={`fa-solid ${iconaVeicolo}`} />
            <span>Veicolo</span>
          </div>
          <div className="iv-hero-body">
            <div className="iv-hero-icon">
              <i className={`fa-solid ${iconaVeicolo}`} />
            </div>
            <div className="iv-hero-info">
              <div className="iv-hero-name">{nomeVeicolo}</div>
              <div className="iv-hero-sub">
                <span className="iv-targa-pill">
                  <i className="fa-solid fa-id-card" /> <span>{dettaglio?.targa ?? "-"}</span>
                </span>
                <span className="iv-mini-pill">
                  <i className={`fa-solid ${iconaVeicolo}`} /> Tipo <strong>{dg.tipo_veicolo ?? "-"}</strong>
                </span>
                <span className="iv-mini-pill">
                  <i className="fa-solid fa-calendar" /> Anno{" "}
                  <strong>
                    {ds.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : "-"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Caratteristiche tecniche */}
        <div className="iv-section-card" onMouseMove={onTilt} onMouseLeave={resetTilt}>
          <div className="iv-section-bar">
            <i className="fa-solid fa-gears" />
            <span>Caratteristiche tecniche</span>
          </div>
          <div className="iv-specs-grid">
            <div className="iv-spec-tile">
              <div className="iv-spec-icon">
                <i className="fa-solid fa-bolt" />
              </div>
              <div className="iv-spec-text">
                <span className="iv-spec-lbl">Alimentazione</span>
                <span className="iv-spec-val">{dg.alimentazione ?? "-"}</span>
              </div>
            </div>
            <div className="iv-spec-tile">
              <div className="iv-spec-icon">
                <i className="fa-solid fa-oil-can" />
              </div>
              <div className="iv-spec-text">
                <span className="iv-spec-lbl">Cilindrata</span>
                <span className="iv-spec-val">{dg.cilindrata ? `${dg.cilindrata} cc` : "-"}</span>
              </div>
            </div>
            <div className="iv-spec-tile">
              <div className="iv-spec-icon">
                <i className="fa-solid fa-gauge-high" />
              </div>
              <div className="iv-spec-text">
                <span className="iv-spec-lbl">Potenza</span>
                <span className="iv-spec-val">{dg.cavalli ? `${dg.cavalli} CV` : "-"}</span>
              </div>
            </div>
            <div className="iv-spec-tile">
              <div className="iv-spec-icon">
                <i className="fa-solid fa-car-side" />
              </div>
              <div className="iv-spec-text">
                <span className="iv-spec-lbl">Marca</span>
                <span className="iv-spec-val">{dettaglio?.marca ?? "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mantenimento */}
        <div className="iv-section-card" onMouseMove={onTilt} onMouseLeave={resetTilt}>
          <div className="iv-section-bar">
            <i className="fa-solid fa-calendar-check" />
            <span>Mantenimento</span>
          </div>
          <div className="iv-maint-grid">
            <div className={`iv-maint-pill stato-${statoBollo}`}>
              <div className="iv-maint-left">
                <div className="iv-maint-icon">
                  <i className="fa-solid fa-receipt" />
                </div>
                <div className="iv-maint-info">
                  <span className="iv-maint-title">Bollo</span>
                  <span className="iv-maint-date">{dataBollo}</span>
                </div>
              </div>
              <span className={`iv-badge iv-badge-${statoBollo}`}>
                <span className="iv-badge-dot" /> {statoBollo === "attiva" ? "Attivo" : "Scaduto"}
              </span>
            </div>
            <div className={`iv-maint-pill stato-${statoRca}`}>
              <div className="iv-maint-left">
                <div className="iv-maint-icon">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div className="iv-maint-info">
                  <span className="iv-maint-title">
                    Assicurazione · <span>{ds.nomeassicurazione ?? "-"}</span>
                  </span>
                  <span className="iv-maint-date">{dataRca}</span>
                </div>
              </div>
              <span className={`iv-badge iv-badge-${statoRca}`}>
                <span className="iv-badge-dot" /> {statoRca === "attiva" ? "Attiva" : "Scaduta"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
