"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  avviaCheckoutStripe,
  disdiciAbbonamento,
  getAbbonamento,
} from "@/lib/api";
import type { PianoUtente } from "@/lib/types";

const NOMI_PIANI: Record<string, string> = { base: "Base", premium: "Premium", pro: "Pro" };

interface DefinizionePiano {
  id: PianoUtente;
  nome: string;
  prezzo: string;
  suffisso?: string;
  descrizione: string;
  feature: { ok: boolean; label: string }[];
  popolare?: boolean;
  free?: boolean;
}

const PIANI: DefinizionePiano[] = [
  {
    id: "base",
    nome: "Base",
    prezzo: "Gratis",
    descrizione: "Per iniziare a gestire i tuoi veicoli",
    free: true,
    feature: [
      { ok: true, label: "1 veicolo" },
      { ok: true, label: "Storico interventi base" },
      { ok: true, label: "Notifiche scadenze" },
      { ok: false, label: "Prenotazione officine" },
      { ok: false, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    prezzo: "4,99€",
    suffisso: "/mese",
    descrizione: "Per chi vuole il massimo dalla propria auto",
    popolare: true,
    feature: [
      { ok: true, label: "Fino a 5 veicoli" },
      { ok: true, label: "Storico completo interventi" },
      { ok: true, label: "Notifiche personalizzate" },
      { ok: true, label: "Prenotazione officine" },
      { ok: true, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    prezzo: "9,99€",
    suffisso: "/mese",
    descrizione: "Per chi gestisce più veicoli e vuole tutto",
    feature: [
      { ok: true, label: "Veicoli illimitati" },
      { ok: true, label: "Storico + grafici costi" },
      { ok: true, label: "Notifiche avanzate" },
      { ok: true, label: "Prenotazione prioritaria" },
      { ok: true, label: "Recensioni + community" },
      { ok: true, label: "Supporto prioritario" },
    ],
  },
];

/**
 * Abbonamenti: banner del piano attivo, tre card (Base/Premium/Pro) con
 * tilt 3D, checkout Stripe server-driven e disdetta.
 */
export default function AbbonamentiPage() {
  const { utente, aggiornaUtente, gestisci401 } = useAuth();
  const [pianoAttivo, setPianoAttivo] = useState<string>("base");
  const [sottotitolo, setSottotitolo] = useState("Piano gratuito · Nessun rinnovo");

  const caricaPianoAttivo = useCallback(async () => {
    if (!utente) return;
    try {
      const data = await getAbbonamento(utente.id);
      const abbonamento = data.abbonamento?.[0];
      const piano = abbonamento?.piano ?? "base";
      setPianoAttivo(piano);
      setSottotitolo(
        abbonamento?.data_fine
          ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString("it-IT")}`
          : piano === "base"
            ? "Piano gratuito · Nessun rinnovo"
            : "Rinnovo automatico mensile",
      );
      aggiornaUtente({ ...utente, piano });
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore caricamento piano:", err);
    }
    // aggiornaUtente cambierebbe identità di `utente` a ogni giro: si carica per id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente?.id]);

  useEffect(() => {
    void caricaPianoAttivo();
  }, [caricaPianoAttivo]);

  const avviaCheckout = async (piano: PianoUtente) => {
    if (!utente) return;
    try {
      const baseUrl = window.location.origin;
      const data = await avviaCheckoutStripe(piano, utente.id, baseUrl);
      window.location.href = data.url;
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore avvio checkout:", err);
    }
  };

  const disdici = async () => {
    try {
      await disdiciAbbonamento();
      await caricaPianoAttivo();
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore disdetta:", err);
    }
  };

  // tilt 3D delle card (replica di initTiltCards in functions-base.js)
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
    <Layout breadcrumb="Abbonamenti">
      <section className="abb-dashboard">
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

        <div className="abb-section-title">Scegli il tuo piano</div>

        <div className="abb-piani-grid">
          {PIANI.map((piano) => {
            const attivo = piano.id === pianoAttivo;
            const classi = [
              "abb-piano-card",
              piano.free ? "free" : "",
              piano.popolare ? "popolare" : "",
              attivo ? "attivo" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={piano.id}
                className={classi}
                onMouseMove={onTilt}
                onMouseLeave={resetTilt}
              >
                {piano.popolare && <span className="abb-popolare-badge">Più popolare</span>}
                {attivo && (
                  <span className="abb-attivo-badge">
                    <span className="dot" /> Attivo
                  </span>
                )}
                <div className="abb-piano-card-content">
                  <div>
                    <div className="abb-piano-card-nome">{piano.nome}</div>
                    <div className="abb-piano-card-prezzo">
                      {piano.prezzo}
                      {piano.suffisso && <span>{piano.suffisso}</span>}
                    </div>
                    <div className="abb-piano-card-desc">{piano.descrizione}</div>
                  </div>
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
                  ) : piano.id === "base" ? (
                    <button type="button" className="abb-btn ghost" onClick={() => void disdici()}>
                      <i className="fa-solid fa-rotate-left" /> Passa al Base
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="abb-btn cta"
                      onClick={() => void avviaCheckout(piano.id)}
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
      </section>
    </Layout>
  );
}
