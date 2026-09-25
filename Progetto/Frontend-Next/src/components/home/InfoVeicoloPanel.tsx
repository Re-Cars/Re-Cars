"use client";

import Link from "next/link";

import { calcolaSalute, scadenzeVeicolo, type ScadenzaDettaglio } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

const ETICHETTA_SALUTE = {
  ok: "In regola",
  attenzione: "Da monitorare",
  urgente: "Urgente",
} as const;

const SCADENZA_INFO: Record<ScadenzaDettaglio["tipo"], { nome: string; icona: string }> = {
  bollo: { nome: "Bollo", icona: "ti-receipt" },
  assicurazione: { nome: "Assicurazione", icona: "ti-shield" },
  revisione: { nome: "Revisione", icona: "ti-tool" },
};

const STATO_LIVELLO = {
  rossa: "Scaduto",
  arancione: "Imminente",
  gialla: "In avvicinamento",
  ok: "In regola",
} as const;

/** "AB123CD" → "AB 123 CD" come sulla targa vera (solo se ha la forma standard). */
function targaFormattata(targa: string): string {
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(targa)
    ? `${targa.slice(0, 2)} ${targa.slice(2, 5)} ${targa.slice(5)}`
    : targa;
}

function formattaCilindrata(c: string | number | null | undefined): string {
  const n = Number(c);
  return c && Number.isFinite(n) && n > 0 ? `${n.toLocaleString("it-IT")} cc` : "—";
}

/**
 * Scheda del veicolo selezionato in dashboard: hero con marca/modello e
 * targa, dati chiave (cilindrata, anno di immatricolazione, potenza,
 * alimentazione) e "Stato monitoraggio" di bollo, assicurazione e revisione.
 */
export default function InfoVeicoloPanel({ veicolo }: { veicolo: VeicoloDettaglio | null }) {
  if (!veicolo) {
    return (
      <section className="panel dash-info dash-info--vuota">
        <i className="ti ti-car-garage" />
        <p>Aggiungi il tuo primo veicolo per vedere qui dati tecnici e scadenze.</p>
      </section>
    );
  }

  const dg = veicolo.dati_generici[0] ?? {};
  const ds = veicolo.dati_specifici[0] ?? {};
  const isMoto = (dg.tipo_veicolo ?? "").toLowerCase() === "moto";
  const salute = calcolaSalute(veicolo);
  const scadenze = scadenzeVeicolo(veicolo);
  const critiche = scadenze.filter((s) => s.livello !== "ok");
  const peggiore = critiche.reduce<ScadenzaDettaglio | null>(
    (a, s) => (a === null || (s.giorni ?? -Infinity) < (a.giorni ?? -Infinity) ? s : a),
    null,
  );

  const imm = ds.dataimmatricolazione ? new Date(ds.dataimmatricolazione) : null;
  const annoImm = imm && !Number.isNaN(imm.getTime()) ? imm.getFullYear() : null;
  const etaAnni = annoImm ? new Date().getFullYear() - annoImm : null;
  const kw = dg.cavalli ? Math.round(dg.cavalli * 0.7355) : null;

  return (
    <section className="panel dash-info" aria-label="Veicolo selezionato">
      <div className={`dash-hero ${isMoto ? "moto" : "auto"}`}>
        <div className="dash-hero-top">
          <span className={`dash-pill-stato salute-${salute}`}>
            <span className="dash-pill-dot" />
            {ETICHETTA_SALUTE[salute]}
          </span>
        </div>
        <div className="dash-hero-name">
          <div className="dash-hero-brand">{veicolo.marca ?? ""}</div>
          <div className="dash-hero-model">{veicolo.modello || veicolo.targa}</div>
        </div>
        <div className="dash-hero-meta">
          <span className="targa-it">
            <span className="targa-it-eu">I</span>
            <span className="targa-it-num">{targaFormattata(veicolo.targa)}</span>
            <span className="targa-it-eu targa-it-eu--dx" />
          </span>
          {imm && annoImm && (
            <span className="dash-hero-since">
              <i className="ti ti-calendar" />
              Immatricolata il {imm.toLocaleDateString("it-IT")}
            </span>
          )}
        </div>
        <div className="dash-hero-actions">
          <Link href="/prenotazioni" className="btn-dash btn-dash-primary">
            <i className="ti ti-calendar-plus" />
            Prenota intervento
          </Link>
        </div>
      </div>

      <div className="dash-info-body">
        <div className="dash-specs">
          <div className="dash-spec dash-spec--key">
            <span className="dash-spec-ic"><i className="ti ti-engine" /></span>
            <span className="dash-spec-txt">
              <span className="dash-spec-lbl">Cilindrata</span>
              <span className="dash-spec-val">{formattaCilindrata(dg.cilindrata)}</span>
            </span>
          </div>
          <div className="dash-spec dash-spec--key">
            <span className="dash-spec-ic"><i className="ti ti-calendar" /></span>
            <span className="dash-spec-txt">
              <span className="dash-spec-lbl">Immatricolazione</span>
              <span className="dash-spec-val">
                {annoImm ?? "—"}
                {etaAnni !== null && <small>{etaAnni === 1 ? "1 anno" : `${etaAnni} anni`}</small>}
              </span>
            </span>
          </div>
          <div className="dash-spec">
            <span className="dash-spec-ic"><i className="ti ti-gauge" /></span>
            <span className="dash-spec-txt">
              <span className="dash-spec-lbl">Potenza</span>
              <span className="dash-spec-val">
                {dg.cavalli ? `${dg.cavalli} CV` : "—"}
                {kw !== null && <small>{kw} kW</small>}
              </span>
            </span>
          </div>
          <div className="dash-spec">
            <span className="dash-spec-ic"><i className="ti ti-gas-station" /></span>
            <span className="dash-spec-txt">
              <span className="dash-spec-lbl">Alimentazione</span>
              <span className="dash-spec-val">{dg.alimentazione ?? "—"}</span>
            </span>
          </div>
        </div>

        <div className="dash-monitor">
          <div className="dash-monitor-head">
            <h3 className="dash-title">
              <i className="ti ti-shield-check" />
              Stato monitoraggio
            </h3>
            {peggiore ? (
              <span className={`dash-summary lv-${peggiore.livello}`}>
                <i className="ti ti-alert-triangle" />
                {critiche.length === 1
                  ? "1 scadenza richiede attenzione"
                  : `${critiche.length} scadenze richiedono attenzione`}
              </span>
            ) : (
              <span className="dash-summary lv-ok">
                <i className="ti ti-circle-check" />
                Tutto in regola
              </span>
            )}
          </div>

          <div className="dash-scad-grid">
            {scadenze.map((s) => {
              const info = SCADENZA_INFO[s.tipo];
              const pct =
                s.giorni === null ? 0 : s.giorni < 0 ? 100 : Math.max(4, Math.min(100, 100 - (s.giorni / 365) * 100));
              const dataStr = s.data ? s.data.toLocaleDateString("it-IT") : null;
              return (
                <div key={s.tipo} className={`dash-scad lv-${s.giorni === null ? "nd" : s.livello}`}>
                  <div className="dash-scad-top">
                    <span className="dash-scad-ic"><i className={`ti ${info.icona}`} /></span>
                    <div className="dash-scad-name">
                      {info.nome}
                      <small>
                        {s.tipo === "assicurazione" && ds.nomeassicurazione ? `${ds.nomeassicurazione} · ` : ""}
                        {dataStr ? `${s.giorni !== null && s.giorni < 0 ? "scaduto il" : "scade il"} ${dataStr}` : "dato non disponibile"}
                      </small>
                    </div>
                  </div>
                  <div className="dash-scad-mid">
                    {s.giorni === null ? (
                      <span className="dash-scad-days">—</span>
                    ) : (
                      <>
                        <span className="dash-scad-days">
                          {Math.abs(s.giorni)}
                          <span>{s.giorni < 0 ? "gg fa" : s.giorni === 1 ? "giorno" : "giorni"}</span>
                        </span>
                        <span className="dash-scad-cap">{s.giorni < 0 ? "dalla scadenza" : "alla scadenza"}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <div className="dash-bar"><i style={{ width: `${pct}%` }} /></div>
                    <div className="dash-scad-foot">
                      {s.giorni === null ? "Non disponibile" : STATO_LIVELLO[s.livello]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
