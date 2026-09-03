"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";

import OfficinaLayout from "@/components/officina/OfficinaLayout";
import { avviaCheckoutStripeOfficina, getProfiloOfficina } from "@/lib/api";

const NOMI_PIANI: Record<string, string> = {
  officina_business: "Business",
  officina_business_pro: "Business Pro",
};

interface PianoOfficina {
  key: string;
  nome: string;
  prezzo: string;
  descrizione: string;
  feature: { ok: boolean; label: string }[];
  popolare?: boolean;
}

const PIANI: PianoOfficina[] = [
  {
    key: "officina_business",
    nome: "Business",
    prezzo: "29,99€",
    descrizione: "Per officine che vogliono essere visibili e gestire le prenotazioni",
    feature: [
      { ok: true, label: "Visibile nel catalogo" },
      { ok: true, label: "Prenotazioni illimitate" },
      { ok: true, label: "Dashboard prenotazioni" },
      { ok: true, label: "Agenda appuntamenti" },
      { ok: false, label: "Posizione prioritaria" },
      { ok: false, label: "Badge verificata" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    key: "officina_business_pro",
    nome: "Business Pro",
    prezzo: "59,99€",
    descrizione: "Per officine che vogliono il massimo della visibilità e del supporto",
    popolare: true,
    feature: [
      { ok: true, label: "Tutto di Business" },
      { ok: true, label: "Posizione prioritaria" },
      { ok: true, label: "Badge verificata" },
      { ok: true, label: "Supporto prioritario" },
      { ok: true, label: "Statistiche avanzate" },
      { ok: true, label: "Export prenotazioni" },
      { ok: true, label: "API accesso dati" },
    ],
  },
];

/** Abbonamenti officina: piani Business / Business Pro con checkout Stripe. */
export default function AbbonamentiOfficinaPage() {
  const [pianoAttivo, setPianoAttivo] = useState("officina_business");
  const [sottotitolo, setSottotitolo] = useState("Rinnovo automatico mensile");

  const caricaPianoAttivo = useCallback(async () => {
    try {
      const data = await getProfiloOfficina();
      const abbonamento = data.officina.abbonamento?.[0];
      const piano = abbonamento?.piano ?? "officina_business";
      setPianoAttivo(piano);
      setSottotitolo(
        abbonamento?.data_fine
          ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString("it-IT")}`
          : "Rinnovo automatico mensile",
      );
    } catch (err) {
      console.error("Errore caricamento piano:", err);
    }
  }, []);

  useEffect(() => {
    void caricaPianoAttivo();
  }, [caricaPianoAttivo]);

  const avviaCheckout = async (piano: string) => {
    try {
      const data = await avviaCheckoutStripeOfficina(piano, window.location.origin);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Errore checkout:", err);
    }
  };

  const onTilt = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-10px) scale(1.015)`;
  };
  const resetTilt = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <OfficinaLayout
      briciole={[{ label: "Profilo Officina", href: "/profilo-officina" }, { label: "Abbonamenti" }]}
    >
      <div className="abb-dashboard">
        <div className="abb-piano-attivo">
          <div className="abb-piano-left">
            <span className="abb-piano-label">Piano attivo</span>
            <span className="abb-piano-nome">{NOMI_PIANI[pianoAttivo] ?? pianoAttivo}</span>
            <span className="abb-piano-sub">{sottotitolo}</span>
          </div>
          <span className="abb-piano-stato">
            <span className="abb-piano-stato-dot" />
            Attivo
          </span>
        </div>

        <span className="abb-section-title">Scegli il tuo piano</span>

        <div className="abb-piani-grid abb-piani-grid-officina">
          {PIANI.map((piano) => {
            const attivo = piano.key === pianoAttivo;
            const classi = [
              "abb-piano-card",
              piano.popolare ? "popolare" : "",
              attivo ? "attivo" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={piano.key} className={classi} onMouseMove={onTilt} onMouseLeave={resetTilt}>
                {piano.popolare && <span className="abb-popolare-badge">Più popolare</span>}
                {attivo && (
                  <span className="abb-attivo-badge">
                    <span className="dot" /> Attivo
                  </span>
                )}
                <div className="abb-piano-card-content">
                  <div className="abb-piano-card-nome">{piano.nome}</div>
                  <div className="abb-piano-card-prezzo">
                    {piano.prezzo}
                    <span>/mese</span>
                  </div>
                  <div className="abb-piano-card-desc">{piano.descrizione}</div>
                  <div className="abb-piano-features">
                    {piano.feature.map((f) => (
                      <div key={f.label} className={`abb-feature ${f.ok ? "ok" : "no"}`}>
                        <i className={`fa-solid ${f.ok ? "fa-check" : "fa-xmark"}`} /> {f.label}
                      </div>
                    ))}
                  </div>
                  {attivo ? (
                    <button type="button" className="abb-btn status">
                      <i className="fa-solid fa-check" /> Piano attuale
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="abb-btn cta"
                      onClick={() => void avviaCheckout(piano.key)}
                    >
                      <i className="fa-solid fa-credit-card" /> Abbonati ora
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="abb-stripe-note">
          <i className="fa-solid fa-lock" />
          Il pagamento è gestito in modo sicuro da Stripe. Non conserviamo i dati della tua carta.
          Disdici in qualsiasi momento.
        </div>
      </div>
    </OfficinaLayout>
  );
}
