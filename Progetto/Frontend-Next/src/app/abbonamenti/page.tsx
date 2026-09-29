"use client";

import { useCallback, useEffect, useState } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  apriPortalePagamento,
  avviaCheckoutStripe,
  disdiciAbbonamento,
  getStatoAbbonamento,
  impostaRinnovoAutomatico,
  type StatoAbbonamento,
} from "@/lib/api";
import { dimenticaPiano, nomePiano, pianoDa } from "@/hooks/usePiano";
import type { PianoUtente } from "@/lib/types";

interface DefinizionePiano {
  id: PianoUtente;
  nome: string;
  prezzo: string;
  suffisso?: string;
  descrizione: string;
  feature: { ok: boolean; label: string }[];
  /** Icona Tabler: germoglio → diamante, per leggere la progressione dei piani. */
  icona: string;
  /** Veicoli ammessi dal piano (null = illimitati). */
  limiteVeicoli: number | null;
}

/**
 * Solo ciò che l'app fa davvero: le funzioni Premium sono bloccate nel
 * backend (targa, distributori, limite assistente) o nell'interfaccia
 * (libretto da foto, costi di gestione, PDF). Tenere allineato con
 * Backend/src/piano.ts e con la descrizione "abbonamenti" dell'assistente.
 */
const PIANI: DefinizionePiano[] = [
  {
    id: "base",
    nome: "Gratis",
    prezzo: "0€",
    suffisso: "per sempre",
    descrizione: "Tutto l'essenziale per un veicolo",
    icona: "ti-plant-2",
    limiteVeicoli: 1,
    feature: [
      { ok: true, label: "1 veicolo, con i dati inseriti a mano" },
      { ok: true, label: "Scadenze di bollo, assicurazione e revisione" },
      { ok: true, label: "Notifiche sul telefono prima di ogni scadenza" },
      { ok: true, label: "Storico interventi" },
      { ok: true, label: "Prenotazione in officina, con mappa e percorso" },
      { ok: true, label: "Assistente RE|CARS: 10 domande al giorno" },
      { ok: false, label: "Aggiunta del veicolo dalla targa" },
      { ok: false, label: "Lettura del libretto da foto" },
      { ok: false, label: "Costi di gestione e grafici" },
      { ok: false, label: "Report PDF dello storico" },
      { ok: false, label: "Distributori vicini con i prezzi del giorno" },
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    prezzo: "9,99€",
    suffisso: "/mese",
    descrizione: "Per chi ha più veicoli e vuole tenere i conti",
    icona: "ti-diamond",
    limiteVeicoli: null,
    feature: [
      { ok: true, label: "Veicoli illimitati" },
      { ok: true, label: "Tutto quello del piano Gratis" },
      { ok: true, label: "Aggiunta del veicolo dalla targa" },
      { ok: true, label: "Lettura del libretto da foto" },
      { ok: true, label: "Costi di gestione: spese per mese e categoria" },
      { ok: true, label: "Report PDF dello storico, da stampare o inviare" },
      { ok: true, label: "Distributori vicini con i prezzi del giorno" },
      { ok: true, label: "Assistente RE|CARS: 50 domande al giorno" },
    ],
  },
];

/**
 * Abbonamenti: hero con piano attivo e veicoli usati rispetto al limite,
 * due card (Gratis/Premium), checkout Stripe server-driven e disdetta.
 */
export default function AbbonamentiPage() {
  const { utente, aggiornaUtente, gestisci401, veicoli } = useAuth();
  const [pianoAttivo, setPianoAttivo] = useState<string>("base");
  const [sottotitolo, setSottotitolo] = useState("Piano gratuito · Nessun rinnovo");

  const [stato, setStato] = useState<StatoAbbonamento | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState("");
  // su telefono l'elenco delle funzioni di ogni piano si apre al tocco
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  const applicaStato = useCallback(
    (s: StatoAbbonamento) => {
      setStato(s);
      if (utente) dimenticaPiano(utente.id);
      setPianoAttivo(pianoDa(s.piano));
      const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT") : "");
      setSottotitolo(
        pianoDa(s.piano) === "base"
          ? "Piano gratuito · Nessun rinnovo"
          : s.dataFine
            ? `Attivo fino al ${data(s.dataFine)} · rinnovo spento`
            : s.prossimoRinnovo
              ? `Si rinnova da solo il ${data(s.prossimoRinnovo)}`
              : "Rinnovo automatico mensile",
      );
    },
    [utente],
  );

  const caricaPianoAttivo = useCallback(async () => {
    if (!utente) return;
    try {
      const s = await getStatoAbbonamento();
      applicaStato(s);
      aggiornaUtente({ ...utente, piano: s.piano });
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore caricamento piano:", err);
    }
    // aggiornaUtente cambierebbe identità di `utente` a ogni giro: si carica per id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente?.id]);

  useEffect(() => {
    void caricaPianoAttivo();
  }, [caricaPianoAttivo]);

  const esegui = async (azione: () => Promise<void>) => {
    if (inCorso) return;
    setInCorso(true);
    setErrore("");
    try {
      await azione();
    } catch (err) {
      if (!gestisci401(err)) {
        setErrore(err instanceof ApiError ? err.message : "Operazione non riuscita, riprova.");
      }
    } finally {
      setInCorso(false);
    }
  };

  const avviaCheckout = (piano: PianoUtente) =>
    esegui(async () => {
      if (!utente) return;
      const data = await avviaCheckoutStripe(piano, utente.id, window.location.origin);
      window.location.href = data.url;
    });

  const cambiaRinnovo = (automatico: boolean) =>
    esegui(async () => applicaStato(await impostaRinnovoAutomatico(automatico)));

  const gestisciPagamento = () =>
    esegui(async () => {
      const { url } = await apriPortalePagamento(window.location.origin);
      window.location.href = url;
    });

  const disdici = () =>
    esegui(async () => {
      const fine = stato?.prossimoRinnovo ? new Date(stato.prossimoRinnovo).toLocaleDateString("it-IT") : null;
      const ok = window.confirm(
        fine
          ? `Premium resta attivo fino al ${fine}, poi torni al piano Gratis senza altri addebiti. Confermi?`
          : "Vuoi tornare al piano Gratis?",
      );
      if (!ok) return;
      await disdiciAbbonamento();
      await caricaPianoAttivo();
    });

  const giornoIt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("it-IT") : "");
  const rinnovoSpento = stato?.rinnovoAutomatico === false;

  const definizioneAttiva = PIANI.find((pn) => pn.id === pianoAttivo) ?? PIANI[0];
  const limite = definizioneAttiva.limiteVeicoli;
  const usoPct = limite ? Math.min(100, (veicoli.length / limite) * 100) : 100;
  // piano consigliato: il primo superiore a quello attivo (niente se già Premium)
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
              {nomePiano(pianoAttivo)}
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

        {errore && (
          <p className="ov-err abb2-err" role="alert">
            <i className="ti ti-alert-circle" />
            {errore}
          </p>
        )}

        {pianoAttivo === "premium" && stato?.gestibile && (
          <section className={`pg-card abb2-rinnovo${rinnovoSpento ? " spento" : ""}`}>
            <div className="abb2-rinnovo-txt">
              <b>
                <i className={`ti ${rinnovoSpento ? "ti-alert-triangle" : "ti-refresh"}`} />
                Rinnovo automatico
              </b>
              <p>
                {rinnovoSpento
                  ? `È spento: il ${giornoIt(stato.dataFine)} torni al piano Gratis e non ti addebitiamo nulla. Ti avvisiamo con una notifica una settimana prima.`
                  : `Ogni mese Stripe addebita 9,99 € sulla carta salvata e Premium continua senza interruzioni. Prossimo rinnovo: ${giornoIt(stato.prossimoRinnovo) || "a fine mese"}.`}
              </p>
            </div>
            <div className="abb2-rinnovo-azioni">
              <button
                type="button"
                role="switch"
                aria-checked={!rinnovoSpento}
                className={`abb2-switch${rinnovoSpento ? "" : " on"}`}
                disabled={inCorso}
                onClick={() => void cambiaRinnovo(rinnovoSpento)}
              >
                <span />
                {rinnovoSpento ? "Riattiva" : "Attivo"}
              </button>
              <button type="button" className="btn-dash btn-dash-ghost" disabled={inCorso} onClick={() => void gestisciPagamento()}>
                <i className="ti ti-credit-card" />
                Gestisci pagamento
              </button>
            </div>
          </section>
        )}

        <div className="abb2-piani">
          {PIANI.map((piano) => {
            const attivo = piano.id === pianoAttivo;
            const reco = piano.id === consigliato;
            return (
              <article
                key={piano.id}
                className={`abb2-piano${attivo ? " attivo" : ""}${reco ? " reco" : ""}${aperti.has(piano.id) ? " aperto" : ""}`}
              >
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
                <button
                  type="button"
                  className="abb2-apri"
                  aria-expanded={aperti.has(piano.id)}
                  onClick={() =>
                    setAperti((a) => {
                      const n = new Set(a);
                      if (n.has(piano.id)) n.delete(piano.id);
                      else n.add(piano.id);
                      return n;
                    })
                  }
                >
                  {aperti.has(piano.id) ? "Nascondi dettagli" : "Cosa include"}
                  <i className="ti ti-chevron-down" />
                </button>
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
                  rinnovoSpento ? (
                    <button type="button" className="btn-dash btn-dash-ghost" disabled>
                      <i className="ti ti-calendar" /> Dal {giornoIt(stato?.dataFine)}
                    </button>
                  ) : (
                    <button type="button" className="btn-dash btn-dash-ghost" disabled={inCorso} onClick={() => void disdici()}>
                      <i className="ti ti-arrow-back-up" /> Passa a Gratis
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className={`btn-dash ${reco ? "btn-dash-primary" : "btn-dash-soft"}`}
                    disabled={inCorso}
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
            <span><b>Rinnovo automatico, disdici quando vuoi</b>Spegni il rinnovo e Premium resta fino a fine mese, senza altri addebiti.</span>
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
