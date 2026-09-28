"use client";

import { useEffect, useState } from "react";

import { ApiError, notificaDiProva } from "@/lib/api";
import {
  attivaNotifiche,
  disattivaNotifiche,
  installaApp,
  iscrizioneAttuale,
  notificheSupportate,
  useStatoInstallazione,
} from "@/lib/pwa";

type StatoNotifiche = "caricamento" | "attive" | "spente" | "negate" | "non-supportate";

/**
 * Card "App e notifiche" dell'account: installazione della PWA e
 * attivazione delle notifiche push su questo dispositivo (scadenze e
 * appuntamenti, inviate dal backend).
 */
export default function SezioneAppNotifiche() {
  const installazione = useStatoInstallazione();
  const [stato, setStato] = useState<StatoNotifiche>("caricamento");
  const [inCorso, setInCorso] = useState(false);
  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  useEffect(() => {
    if (!notificheSupportate()) {
      setStato("non-supportate");
      return;
    }
    if (Notification.permission === "denied") {
      setStato("negate");
      return;
    }
    void iscrizioneAttuale().then((i) => setStato(i && Notification.permission === "granted" ? "attive" : "spente"));
  }, []);

  const esegui = async (azione: () => Promise<void>) => {
    setInCorso(true);
    setMessaggio(null);
    try {
      await azione();
    } catch (err) {
      const testo =
        err instanceof ApiError && err.status === 503
          ? "Le notifiche non sono ancora attive sul server."
          : err instanceof Error
            ? err.message
            : "Operazione non riuscita.";
      setMessaggio({ testo, errore: true });
      if (Notification.permission === "denied") setStato("negate");
    } finally {
      setInCorso(false);
    }
  };

  const testoInstallazione = {
    installata: "Stai usando l'app installata.",
    installabile: "Aggiungila alla schermata Home: si apre a tutto schermo, come un'app.",
    ios: "Su iPhone: tocca Condividi e poi “Aggiungi alla schermata Home”.",
    "non-disponibile": "Aprila da Chrome, Edge o Safari per installarla sul dispositivo.",
  }[installazione];

  const testoNotifiche = {
    caricamento: "…",
    attive: "Attive su questo dispositivo.",
    spente: "Scadenze di bollo, assicurazione e revisione e promemoria degli appuntamenti.",
    negate: "Bloccate dal browser: riattivale dalle impostazioni del sito.",
    "non-supportate":
      installazione === "ios"
        ? "Su iPhone arrivano solo con l'app installata nella schermata Home."
        : "Questo browser non supporta le notifiche.",
  }[stato];

  return (
    <section className="pg-card">
      <div className="pg-card-h">
        <h2 className="dash-title">
          <i className="ti ti-device-mobile" />
          App e notifiche
        </h2>
      </div>
      <div className="acc2-rows">
        <div className="acc2-row">
          <span className="acc2-ic"><i className="ti ti-apps" /></span>
          <span className="acc2-txt">
            <b>App RE|CARS</b>
            <small className="acc2-nota">{testoInstallazione}</small>
          </span>
          {installazione === "installabile" && (
            <button type="button" className="btn-dash btn-dash-soft" onClick={() => void installaApp()}>
              <i className="ti ti-download" /> Installa
            </button>
          )}
          {installazione === "installata" && (
            <span className="acc2-stato-ok">
              <i className="ti ti-circle-check" /> Installata
            </span>
          )}
        </div>

        <div className="acc2-row">
          <span className="acc2-ic"><i className="ti ti-bell" /></span>
          <span className="acc2-txt">
            <b>Notifiche</b>
            <small className="acc2-nota">{testoNotifiche}</small>
            {messaggio && <small className={messaggio.errore ? "acc2-err" : "acc2-ok"}>{messaggio.testo}</small>}
          </span>
          {stato === "spente" && (
            <button
              type="button"
              className="btn-dash btn-dash-primary"
              disabled={inCorso}
              onClick={() =>
                void esegui(async () => {
                  await attivaNotifiche();
                  setStato("attive");
                  setMessaggio({ testo: "Fatto! Ti avviseremo qui.", errore: false });
                })
              }
            >
              <i className="ti ti-bell-ringing" /> {inCorso ? "Attivazione…" : "Attiva"}
            </button>
          )}
          {stato === "attive" && (
            <span className="acc2-azioni">
              <button
                type="button"
                className="btn-dash btn-dash-soft"
                disabled={inCorso}
                onClick={() =>
                  void esegui(async () => {
                    const { inviate } = await notificaDiProva();
                    setMessaggio(
                      inviate > 0
                        ? { testo: "Notifica di prova inviata.", errore: false }
                        : { testo: "Nessun dispositivo raggiunto: disattiva e riattiva.", errore: true },
                    );
                  })
                }
              >
                <i className="ti ti-send" /> Prova
              </button>
              <button
                type="button"
                className="btn-dash btn-dash-ghost"
                disabled={inCorso}
                onClick={() =>
                  void esegui(async () => {
                    await disattivaNotifiche();
                    setStato("spente");
                  })
                }
              >
                <i className="ti ti-bell-off" /> Disattiva
              </button>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
