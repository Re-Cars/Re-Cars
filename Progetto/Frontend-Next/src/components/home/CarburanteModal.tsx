"use client";

import { useCallback, useEffect, useState } from "react";

import Overlay from "@/components/ui/Overlay";
import { ApiError, getCarburantiVicini, type Carburante, type RispostaCarburanti } from "@/lib/api";
import { formattaKm } from "@/lib/geo";

export const ETICHETTA_CARBURANTE: Record<Carburante, string> = {
  benzina: "Benzina",
  gasolio: "Gasolio",
  gpl: "GPL",
  metano: "Metano",
};

const RAGGI = [3, 5, 10];

/** Alimentazione del veicolo → carburante da cercare (null per le elettriche). */
export function carburanteDelVeicolo(alimentazione: string | null | undefined): Carburante | null {
  const a = (alimentazione ?? "").toLowerCase();
  if (/diesel|gasolio/.test(a)) return "gasolio";
  if (/gpl/.test(a)) return "gpl";
  if (/metano/.test(a)) return "metano";
  if (/elettric/.test(a) && !/ibrid/.test(a)) return null;
  return "benzina";
}

export const prezzoIt = (p: number) => p.toLocaleString("it-IT", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Posizione GPS come promessa (errore già in italiano). */
export function posizione(): Promise<{ lat: number; lng: number }> {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error("Il browser non fornisce la posizione."));
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        ko(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Serve la tua posizione: consentila nelle impostazioni del sito."
              : "Posizione non disponibile, riprova tra poco.",
          ),
        ),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

interface CarburanteModalProps {
  onChiudi: () => void;
  /** Carburante del veicolo selezionato (null se elettrico). */
  iniziale: Carburante | null;
  nomeVeicolo?: string;
}

/**
 * "Distributori vicini" (Premium): distributori entro pochi km ordinati per prezzo,
 * dagli open data del Ministero (GET /carburanti/vicini). Il tocco su un
 * distributore apre la navigazione.
 */
export default function CarburanteModal({ onChiudi, iniziale, nomeVeicolo }: CarburanteModalProps) {
  const [carburante, setCarburante] = useState<Carburante>(iniziale ?? "benzina");
  const [raggio, setRaggio] = useState(5);
  const [stato, setStato] = useState<"posizione" | "caricamento" | "ok" | "errore">("posizione");
  const [errore, setErrore] = useState("");
  const [dati, setDati] = useState<RispostaCarburanti | null>(null);

  const cerca = useCallback(async (c: Carburante, r: number) => {
    setErrore("");
    try {
      setStato("posizione");
      const { lat, lng } = await posizione();
      setStato("caricamento");
      setDati(await getCarburantiVicini(lat, lng, c, r));
      setStato("ok");
    } catch (err) {
      setErrore(
        err instanceof ApiError
          ? err.status === 503
            ? "I prezzi del Ministero non sono raggiungibili adesso: riprova più tardi."
            : err.message
          : err instanceof Error
            ? err.message
            : "Ricerca non riuscita.",
      );
      setStato("errore");
    }
  }, []);

  useEffect(() => {
    void cerca(carburante, raggio);
  }, [cerca, carburante, raggio]);

  const unita = carburante === "metano" ? "€/kg" : "€/l";
  const aggiornamento = dati?.estrazione
    ? new Date(`${dati.estrazione}T00:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long" })
    : null;

  return (
    <Overlay
      onChiudi={onChiudi}
      titolo="Distributori vicini"
      icona="ti-gas-station"
      larghezza={600}
      sottotitolo={
        iniziale === null
          ? "Per le auto elettriche non ci sono ancora i prezzi delle colonnine: qui trovi i distributori."
          : `I distributori più economici vicino a te${nomeVeicolo ? ` per ${nomeVeicolo}` : ""}.`
      }
      piede={
        <span className="ov-nota">
          <i className="ti ti-info-circle" />
          Prezzi comunicati dai gestori al Ministero (Osservaprezzi carburanti)
          {aggiornamento ? `, aggiornati al ${aggiornamento}` : ""}: alla pompa possono essere cambiati.
        </span>
      }
    >
      <div className="cv-filtri">
        <div className="ov-seg chips">
          {(Object.keys(ETICHETTA_CARBURANTE) as Carburante[]).map((c) => (
            <button key={c} type="button" className={carburante === c ? "on" : ""} onClick={() => setCarburante(c)}>
              {ETICHETTA_CARBURANTE[c]}
            </button>
          ))}
        </div>
        <div className="ov-seg chips">
          {RAGGI.map((r) => (
            <button key={r} type="button" className={raggio === r ? "on" : ""} onClick={() => setRaggio(r)}>
              {r} km
            </button>
          ))}
        </div>
      </div>

      {stato === "errore" && (
        <p className="ov-err" role="alert">
          <i className="ti ti-alert-circle" />
          {errore}
          <button type="button" className="cv-riprova" onClick={() => void cerca(carburante, raggio)}>
            Riprova
          </button>
        </p>
      )}

      {(stato === "posizione" || stato === "caricamento") && (
        <div className="cv-attesa" role="status">
          <i className="ti ti-current-location" />
          {stato === "posizione" ? "Cerco la tua posizione…" : "Confronto i prezzi…"}
        </div>
      )}

      {stato === "ok" && dati && dati.impianti.length === 0 && (
        <div className="cv-attesa">
          <i className="ti ti-gas-station-off" />
          Nessun distributore con {ETICHETTA_CARBURANTE[carburante].toLowerCase()} entro {raggio} km.
        </div>
      )}

      {stato === "ok" && dati && dati.impianti.length > 0 && (
        <ol className="cv-lista">
          {dati.impianti.map((d, i) => (
            <li key={d.id} className={i === 0 ? "migliore" : ""}>
              <span className="cv-pos">{i + 1}</span>
              <div className="cv-info">
                <b>{d.bandiera}</b>
                <span>
                  {d.indirizzo}
                  {d.comune ? `, ${d.comune}` : ""}
                </span>
              </div>
              <div className="cv-prezzo">
                <b>{prezzoIt(d.prezzo)}</b>
                <span>
                  {unita} · {d.self ? "self" : "servito"}
                </span>
              </div>
              <a
                className="btn-dash btn-dash-ghost cv-naviga"
                href={`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Naviga verso ${d.bandiera}, ${formattaKm(d.distanzaKm)}`}
              >
                <i className="ti ti-navigation" />
                <span>{formattaKm(d.distanzaKm)}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </Overlay>
  );
}
