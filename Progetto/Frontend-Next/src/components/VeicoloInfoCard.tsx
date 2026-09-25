"use client";

import { type MouseEvent } from "react";

import { giorniAllaData } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

type StatoMantenimento = "attiva" | "scaduta";

/**
 * Stato di un documento (bollo / assicurazione) con la stessa regola di
 * calcolaSalute in lib/scadenze.ts — unica fonte di verità, così questa
 * card e i pallini di stato della rail non possono divergere: conta la
 * data, e un flag esplicitamente `false` forza comunque "scaduta".
 */
function statoDaData(
  data: string | null | undefined,
  attivo: boolean | null | undefined,
): StatoMantenimento {
  if (!data) return "scaduta";
  const giorni = giorniAllaData(data);
  if (giorni === null) return "scaduta";
  if (attivo === false) return "scaduta";
  return giorni < 0 ? "scaduta" : "attiva";
}

interface VeicoloInfoCardProps {
  veicolo: VeicoloDettaglio | null;
}

/**
 * Hero + caratteristiche tecniche + mantenimento del veicolo della pagina
 * /info-veicolo (la dashboard usa InfoVeicoloPanel).
 */
export default function VeicoloInfoCard({ veicolo }: VeicoloInfoCardProps) {
  const dg = veicolo?.dati_generici[0] ?? {};
  const ds = veicolo?.dati_specifici[0] ?? {};

  const nomeVeicolo = `${veicolo?.marca ?? ""} ${veicolo?.modello ?? ""}`.trim() || "Veicolo";
  const isMoto = (dg.tipo_veicolo ?? "").toLowerCase() === "moto";
  const iconaVeicolo = isMoto ? "fa-motorcycle" : "fa-car";

  const statoBollo = statoDaData(ds.datascadenzabollo, ds.isbolloattivo);
  const statoRca = statoDaData(ds.datascadenzarca, ds.isinsured);

  const dataBollo = ds.datascadenzabollo
    ? `scade il ${new Date(ds.datascadenzabollo).toLocaleDateString("it-IT")}`
    : "Dato non disponibile";
  const dataRca = ds.datascadenzarca
    ? `scade il ${new Date(ds.datascadenzarca).toLocaleDateString("it-IT")}`
    : "Dato non disponibile";

  if (!veicolo) return null;

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
    <div className="iv-dashboard">
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
                <i className="fa-solid fa-id-card" /> <span>{veicolo.targa}</span>
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
              <span className="iv-spec-val">{veicolo.marca ?? "-"}</span>
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
    </div>
  );
}
