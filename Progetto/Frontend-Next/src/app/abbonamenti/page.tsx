"use client";

import { useCallback, useEffect, useState } from "react";

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
  /** Icona Tabler: germoglio → diamante → corona, per leggere la progressione dei piani. */
  icona: string;
  /** Veicoli ammessi dal piano (null = illimitati). */
  limiteVeicoli: number | null;
  popolare?: boolean;
  free?: boolean;
}

const PIANI: DefinizionePiano[] = [
  {
    id: "base",
    nome: "Base",
    prezzo: "Gratis",
    descrizione: "Per iniziare a gestire i tuoi veicoli",
    icona: "ti-plant-2",
    limiteVeicoli: 1,
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
    icona: "ti-diamond",
    limiteVeicoli: 5,
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
    icona: "ti-crown",
    limiteVeicoli: null,
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
 * Abbonamenti: hero con piano attivo e veicoli usati rispetto al limite,
 * tre card (Base/Premium/Pro), checkout Stripe server-driven e disdetta.
 */
export default function AbbonamentiPage() {
  const { utente, aggiornaUtente, gestisci401, veicoli } = useAuth();
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

  const definizioneAttiva = PIANI.find((pn) => pn.id === pianoAttivo) ?? PIANI[0];
  const limite = definizioneAttiva.limiteVeicoli;
  const usoPct = limite ? Math.min(100, (veicoli.length / limite) * 100) : 100;
  // piano consigliato: il primo superiore a quello attivo (niente se già Pro)
  const indiceAttivo = PIANI.findIndex((pn) => pn.id === pianoAttivo);
  const consigliato = PIANI[indiceAttivo + 1]?.id ?? null;

  return (
    <Layout breadcrumb="Abbonamenti">
      <main className="pg pg--stretta">
        <section className="pg-hero">
          <div className="pg-hero-ttl">
            <h1>
              <i className="ti ti-crown" />
              Abbonamento
            </h1>
            <p>Scegli il piano adatto al tuo garage. Puoi cambiare o disdire quando vuoi.</p>
          </div>
          <div className="abb2-attuale">
            <small>Piano attuale</small>
            <b>
              {NOMI_PIANI[pianoAttivo] ?? pianoAttivo}
              <span className="abb2-attivo">Attivo</span>
            </b>
            <span>{sottotitolo}</span>
          </div>
          <div className="abb2-uso">
            <span>
              <b>Veicoli nel garage</b>
              <b>{limite ? `${veicoli.length} / ${limite}` : `${veicoli.length} · illimitati`}</b>
            </span>
            <div className="abb2-uso-bar">
              <i style={{ width: `${usoPct}%` }} />
            </div>
            {limite !== null && veicoli.length >= limite && (
              <span className="abb2-uso-nota">Hai raggiunto il limite del piano</span>
            )}
          </div>
        </section>

        <div className="abb2-piani">
          {PIANI.map((piano) => {
            const attivo = piano.id === pianoAttivo;
            const reco = piano.id === consigliato;
            return (
              <article key={piano.id} className={`abb2-piano${attivo ? " attivo" : ""}${reco ? " reco" : ""}`}>
                {attivo && <span className="abb2-ribbon ok">PIANO ATTUALE</span>}
                {reco && <span className="abb2-ribbon">CONSIGLIATO PER TE</span>}
                <div className="abb2-ic">
                  <i className={`ti ${piano.icona}`} />
                </div>
                <h3>{piano.nome}</h3>
                <p className="abb2-desc">{piano.descrizione}</p>
                <div className="abb2-prezzo">
                  <b>{piano.prezzo}</b>
                  {piano.suffisso && <span>{piano.suffisso}</span>}
                </div>
                <ul className="abb2-feat">
                  {piano.feature.map((f) => (
                    <li key={f.label} className={f.ok ? "si" : "no"}>
                      <i className={`ti ${f.ok ? "ti-check" : "ti-x"}`} />
                      {f.label}
                    </li>
                  ))}
                </ul>
                {attivo ? (
                  <button type="button" className="btn-dash btn-dash-ok">
                    <i className="ti ti-circle-check" /> Il tuo piano
                  </button>
                ) : piano.id === "base" ? (
                  <button type="button" className="btn-dash btn-dash-ghost" onClick={() => void disdici()}>
                    <i className="ti ti-arrow-back-up" /> Passa a Base
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn-dash ${reco ? "btn-dash-primary" : "btn-dash-soft"}`}
                    onClick={() => void avviaCheckout(piano.id)}
                  >
                    <i className="ti ti-credit-card" /> Passa a {piano.nome}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <div className="abb2-trust">
          <div>
            <i className="ti ti-lock" />
            <span><b>Pagamento sicuro con Stripe</b>Non conserviamo i dati della tua carta.</span>
          </div>
          <div>
            <i className="ti ti-calendar-x" />
            <span><b>Disdici quando vuoi</b>Passando a Base il rinnovo si interrompe.</span>
          </div>
          <div>
            <i className="ti ti-database" />
            <span><b>I tuoi dati restano tuoi</b>Cambiando piano non perdi lo storico.</span>
          </div>
        </div>
      </main>
    </Layout>
  );
}
