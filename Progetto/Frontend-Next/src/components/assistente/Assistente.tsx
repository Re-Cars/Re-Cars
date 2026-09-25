"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { ApiError, chatAssistente, type AzioneAssistente } from "@/lib/api";

interface Messaggio {
  ruolo: "utente" | "assistente";
  testo: string;
  azioni?: AzioneAssistente[];
  /** true finché la risposta sta arrivando (cursore lampeggiante). */
  inCorso?: boolean;
  errore?: boolean;
}

/** Conversazione per scheda del browser: si perde chiudendola (niente localStorage). */
const CHIAVE_SESSIONE = "recars_assistente";
const SUGGERIMENTI = [
  "Quali scadenze ho in arrivo?",
  "Come prenoto un tagliando?",
  "Come aggiungo un veicolo?",
  "Che differenza c'è tra i piani?",
];
const BENVENUTO =
  "Ciao! Sono l'assistente di RE|CARS. Posso spiegarti come funziona la piattaforma, controllare le scadenze dei tuoi veicoli e portarti nella pagina giusta.";

function leggiSessione(): Messaggio[] {
  try {
    const raw = sessionStorage.getItem(CHIAVE_SESSIONE);
    const lista = raw ? (JSON.parse(raw) as Messaggio[]) : [];
    return Array.isArray(lista) ? lista.filter((m) => !m.inCorso) : [];
  } catch {
    return [];
  }
}

/**
 * Assistente RE|CARS: bottone flottante sempre presente nelle pagine utente
 * e pannello chat. Le risposte arrivano in streaming da POST /assistente/chat
 * (Gemini, chiave solo nel backend); le azioni proposte sono link a pagine
 * del sito o domande suggerite, già validate dal backend.
 */
export default function Assistente() {
  const pathname = usePathname();
  const { utente } = useAuth();
  const [aperto, setAperto] = useState(false);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [testo, setTesto] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const annullaRef = useRef<AbortController | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMessaggi(leggiSessione()), []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(messaggi.slice(-30)));
    } catch {
      /* storage non disponibile: la chat funziona lo stesso */
    }
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
  }, [messaggi]);

  useEffect(() => {
    if (!aperto) return;
    inputRef.current?.focus();
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aperto]);

  // chiudere il pannello (o lasciare la pagina) interrompe la risposta in corso
  useEffect(() => {
    if (!aperto) annullaRef.current?.abort();
  }, [aperto]);
  useEffect(() => () => annullaRef.current?.abort(), []);

  const aggiornaUltimo = (fn: (m: Messaggio) => Messaggio) =>
    setMessaggi((lista) => [...lista.slice(0, -1), fn(lista[lista.length - 1])]);

  const invia = useCallback(
    async (domanda: string) => {
      const pulita = domanda.trim();
      if (!pulita || inCorso) return;
      setTesto("");
      setInCorso(true);
      const storico = messaggi
        .filter((m) => !m.errore)
        .slice(-8)
        .map((m) => ({ ruolo: m.ruolo, testo: m.testo.slice(0, 1500) }));
      setMessaggi((lista) => [
        ...lista,
        { ruolo: "utente", testo: pulita },
        { ruolo: "assistente", testo: "", inCorso: true },
      ]);

      const annulla = new AbortController();
      annullaRef.current = annulla;
      try {
        for await (const evento of chatAssistente(
          { messaggio: pulita.slice(0, 1000), storico, pagina: pathname },
          annulla.signal,
        )) {
          if (evento.type === "delta") {
            aggiornaUltimo((m) => ({ ...m, testo: m.testo + evento.text }));
          } else {
            aggiornaUltimo(() => ({
              ruolo: "assistente",
              testo: evento.answer,
              azioni: evento.actions,
              errore: !evento.used_llm,
            }));
          }
        }
        aggiornaUltimo((m) => ({ ...m, inCorso: false }));
      } catch (err) {
        if (annulla.signal.aborted) {
          aggiornaUltimo((m) => ({ ...m, testo: m.testo || "Risposta interrotta.", inCorso: false }));
        } else {
          const testoErrore =
            err instanceof ApiError && err.status === 429
              ? err.message
              : err instanceof ApiError && err.status === 401
                ? "La sessione è scaduta: accedi di nuovo per usare l'assistente."
                : "Non riesco a contattare l'assistente. Controlla la connessione e riprova.";
          aggiornaUltimo(() => ({ ruolo: "assistente", testo: testoErrore, errore: true }));
        }
      } finally {
        setInCorso(false);
        annullaRef.current = null;
      }
    },
    [inCorso, messaggi, pathname],
  );

  if (!utente) return null;

  const ultimoAssistente = [...messaggi].reverse().find((m) => m.ruolo === "assistente" && !m.inCorso);
  const suggerimenti = messaggi.length === 0 ? SUGGERIMENTI : [];

  return (
    <>
      {aperto && (
        <aside className="ai-panel" role="dialog" aria-label="Assistente RE|CARS">
          <div className="ai-head">
            <span className="ai-av">
              <i className="ti ti-sparkles" />
            </span>
            <div className="ai-head-txt">
              <b>Assistente RE|CARS</b>
              <span>{inCorso ? "Sta scrivendo…" : "Online"}</span>
            </div>
            <button
              type="button"
              className="ai-icon-btn"
              title="Nuova conversazione"
              aria-label="Nuova conversazione"
              disabled={inCorso || messaggi.length === 0}
              onClick={() => setMessaggi([])}
            >
              <i className="ti ti-message-plus" />
            </button>
            <button type="button" className="ai-icon-btn" aria-label="Chiudi" onClick={() => setAperto(false)}>
              <i className="ti ti-x" />
            </button>
          </div>

          <div ref={listaRef} className="ai-msgs" aria-live="polite">
            <div className="ai-msg bot">{BENVENUTO}</div>
            {messaggi.map((m, i) => (
              <div key={i} className={`ai-msg ${m.ruolo === "utente" ? "me" : "bot"}${m.errore ? " errore" : ""}`}>
                {m.testo}
                {m.inCorso && <span className="ai-caret" />}
                {m.azioni?.some((a) => a.tipo === "apri_pagina") && (
                  <div className="ai-azioni">
                    {m.azioni.map((a, j) =>
                      a.tipo === "apri_pagina" ? (
                        <Link key={j} href={a.href} className="ai-link" onClick={() => setAperto(false)}>
                          <span className="ai-link-ic">
                            <i className="ti ti-arrow-up-right" />
                          </span>
                          <span className="ai-link-txt">{a.etichetta}</span>
                          <i className="ti ti-chevron-right" />
                        </Link>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {(suggerimenti.length > 0 || ultimoAssistente?.azioni?.some((a) => a.tipo === "chiedi")) && (
            <div className="ai-sugg">
              {suggerimenti.map((s) => (
                <button key={s} type="button" disabled={inCorso} onClick={() => void invia(s)}>
                  {s}
                </button>
              ))}
              {suggerimenti.length === 0 &&
                ultimoAssistente?.azioni?.map((a, j) =>
                  a.tipo === "chiedi" ? (
                    <button key={j} type="button" disabled={inCorso} onClick={() => void invia(a.domanda)}>
                      {a.etichetta}
                    </button>
                  ) : null,
                )}
            </div>
          )}

          <form
            className="ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void invia(testo);
            }}
          >
            <input
              ref={inputRef}
              value={testo}
              maxLength={1000}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Scrivi una domanda…"
              aria-label="Domanda per l'assistente"
            />
            {inCorso ? (
              <button type="button" className="ai-send" aria-label="Interrompi" onClick={() => annullaRef.current?.abort()}>
                <i className="ti ti-player-stop-filled" />
              </button>
            ) : (
              <button type="submit" className="ai-send" aria-label="Invia" disabled={!testo.trim()}>
                <i className="ti ti-send" />
              </button>
            )}
          </form>
          <div className="ai-note">Assistente AI: può commettere errori. Non condividere password o dati di pagamento.</div>
        </aside>
      )}

      <button
        type="button"
        className={`ai-fab${aperto ? " aperto" : ""}`}
        aria-label={aperto ? "Chiudi l'assistente" : "Apri l'assistente"}
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        <i className={`ti ${aperto ? "ti-x" : "ti-sparkles"}`} />
      </button>
    </>
  );
}
