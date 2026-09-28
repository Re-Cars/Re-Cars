"use client";

import { useEffect, useState, type FormEvent } from "react";

import LibrettoFoto from "@/components/LibrettoFoto";
import Overlay from "@/components/ui/Overlay";
import { useAuth } from "@/context/AuthContext";
import {
  aggiungiVeicolo,
  aggiungiVeicoloManuale,
  ApiError,
  cercaVeicoloPerTarga,
  type NuovoVeicoloManuale,
} from "@/lib/api";
import type { DatiLibretto } from "@/lib/libretto";
import { getStoricoTarghe, rimuoviStoricoTarga, salvaStoricoTarga } from "@/lib/storage";
import type { RisultatoRicercaVeicolo } from "@/lib/types";

/** Targa auto (AA123BB) o moto (AA12345), stessa regola del backend. */
const REGEX_TARGA = /^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{2}\d{5})$/;
const ALIMENTAZIONI = ["Benzina", "Diesel", "GPL", "Metano", "Ibrida", "Elettrica"];
const TIPI_PRINCIPALI = [
  { valore: "Autovettura", etichetta: "Auto", icona: "ti-car" },
  { valore: "Moto", etichetta: "Moto", icona: "ti-motorbike" },
  { valore: "Scooter", etichetta: "Scooter", icona: "ti-scooter" },
];
const ALTRI_TIPI = ["Autocarro", "Camper", "Autobus", "Quad"];

type Scheda = "cerca" | "manuale" | "foto";

interface FormManuale {
  tipo_veicolo: string;
  targa: string;
  dataimmatricolazione: string;
  marca: string;
  modello: string;
  alimentazione: string;
  cilindrata: string;
  potenza_kw: string;
  numporte: string;
  nomeassicurazione: string;
  datascadenzarca: string;
  datascadenzabollo: string;
}

const FORM_VUOTO: FormManuale = {
  tipo_veicolo: "Autovettura",
  targa: "",
  dataimmatricolazione: "",
  marca: "",
  modello: "",
  alimentazione: "",
  cilindrata: "",
  potenza_kw: "",
  numporte: "",
  nomeassicurazione: "",
  datascadenzarca: "",
  datascadenzabollo: "",
};

const pulisciTarga = (t: string) => t.replace(/\s+/g, "").toUpperCase();

/**
 * "MERCEDES-BENZ" → "Mercedes-Benz", "CLASSE A 180 D" → "Classe A 180 D":
 * le sigle brevi e le parti con cifre restano maiuscole (BMW, KTM, A180D, MT-07).
 */
function nomeLeggibile(testo: string): string {
  return testo
    .split(" ")
    .map((parola) =>
      parola
        .split("-")
        .map((p) => (p.length <= 3 || /\d/.test(p) ? p : p.charAt(0) + p.slice(1).toLowerCase()))
        .join("-"),
    )
    .join(" ");
}
const intero = (s: string) => (s.trim() ? Number.parseInt(s, 10) : undefined);

/** Primo campo non valido del form manuale (null se è tutto a posto). */
function erroreForm(f: FormManuale): { campo: keyof FormManuale; messaggio: string } | null {
  if (!REGEX_TARGA.test(pulisciTarga(f.targa)))
    return { campo: "targa", messaggio: "Targa non valida: es. AA123BB (auto) o AA12345 (moto)." };
  if (!f.dataimmatricolazione)
    return { campo: "dataimmatricolazione", messaggio: "Inserisci la data di prima immatricolazione (riga B)." };
  if (f.dataimmatricolazione > new Date().toISOString().slice(0, 10))
    return { campo: "dataimmatricolazione", messaggio: "La data di immatricolazione non può essere futura." };
  if (!f.marca.trim()) return { campo: "marca", messaggio: "Inserisci la marca (riga D.1)." };
  if (!f.modello.trim()) return { campo: "modello", messaggio: "Inserisci il modello (riga D.3)." };
  for (const [campo, max] of [["cilindrata", 99999], ["potenza_kw", 2000], ["numporte", 9]] as const) {
    const n = intero(f[campo]);
    if (n !== undefined && (!Number.isFinite(n) || n < 1 || n > max))
      return { campo, messaggio: "Controlla i valori numerici: cilindrata, potenza e porte." };
  }
  return null;
}

interface AggiungiVeicoloOverlayProps {
  aperto: boolean;
  onChiudi: () => void;
  /** Chiamata dopo un'aggiunta andata a buon fine (ricarica il garage). */
  onAggiunto: () => Promise<void> | void;
}

/**
 * "Aggiungi veicolo" della dashboard, con tre schede: ricerca per targa
 * (dataset del backend), inserimento a mano dei dati del libretto (accanto
 * a ogni campo il codice della riga) e, in arrivo, lettura dalla foto del
 * libretto. Guscio e stile comuni in components/ui/Overlay.
 */
export default function AggiungiVeicoloOverlay({ aperto, onChiudi, onAggiunto }: AggiungiVeicoloOverlayProps) {
  const { utente, gestisci401 } = useAuth();

  const [scheda, setScheda] = useState<Scheda>("cerca");
  const [targa, setTarga] = useState("");
  const [storico, setStorico] = useState<string[]>([]);
  const [inRicerca, setInRicerca] = useState(false);
  const [inAggiunta, setInAggiunta] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoRicercaVeicolo | null>(null);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [errore, setErrore] = useState("");
  const [form, setForm] = useState<FormManuale>(FORM_VUOTO);
  const [campoErrato, setCampoErrato] = useState<keyof FormManuale | null>(null);
  /** Campi riempiti dalla foto: evidenziati finché l'utente non li tocca. */
  const [dallaFoto, setDallaFoto] = useState<{ letti: Set<keyof FormManuale>; daVerificare: Set<keyof FormManuale> } | null>(
    null,
  );

  // reset dello stato a ogni apertura + lettura storico da localStorage
  useEffect(() => {
    if (!aperto) return;
    setScheda("cerca");
    setTarga("");
    setRisultato(null);
    setNonTrovato(false);
    setErrore("");
    setForm(FORM_VUOTO);
    setCampoErrato(null);
    setDallaFoto(null);
    setStorico(getStoricoTarghe());
  }, [aperto]);

  const cambiaScheda = (s: Scheda) => {
    setScheda(s);
    setErrore("");
    setCampoErrato(null);
  };

  /** Dati letti dalla foto → form manuale da controllare. */
  const compilaDaFoto = (dati: DatiLibretto, daVerificare: (keyof DatiLibretto)[]) => {
    const valori: Partial<FormManuale> = {
      targa: dati.targa,
      dataimmatricolazione: dati.dataimmatricolazione,
      marca: dati.marca ? nomeLeggibile(dati.marca) : undefined,
      modello: dati.modello ? nomeLeggibile(dati.modello) : undefined,
      tipo_veicolo: dati.tipo_veicolo,
      alimentazione: dati.alimentazione,
      cilindrata: dati.cilindrata?.toString(),
      potenza_kw: dati.potenza_kw?.toString(),
    };
    const letti = (Object.keys(valori) as (keyof FormManuale)[]).filter((k) => valori[k] !== undefined);
    setForm((f) => ({ ...f, ...Object.fromEntries(letti.map((k) => [k, valori[k]])) }));
    setDallaFoto({ letti: new Set(letti), daVerificare: new Set(daVerificare as (keyof FormManuale)[]) });
    cambiaScheda("manuale");
  };

  const erroreAggiunta = (err: unknown) => {
    if (gestisci401(err)) return;
    if (err instanceof ApiError && err.status === 409) setErrore("Veicolo già presente in un garage.");
    else if (err instanceof ApiError && err.status === 403) setErrore("Hai raggiunto il limite di veicoli del tuo piano.");
    else if (err instanceof ApiError && err.status === 400) setErrore(err.message);
    else setErrore("Errore durante l'aggiunta del veicolo.");
  };

  const cerca = async (e?: FormEvent, targaDiretta?: string) => {
    e?.preventDefault();
    const plate = pulisciTarga(targaDiretta ?? targa);
    if (!plate || inRicerca) return;

    setInRicerca(true);
    setRisultato(null);
    setNonTrovato(false);
    setErrore("");
    try {
      const data = await cercaVeicoloPerTarga(plate);
      setStorico(salvaStoricoTarga(plate));
      setRisultato(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNonTrovato(true);
      else if (!gestisci401(err)) setErrore(err instanceof ApiError ? err.message : "Errore di connessione al server.");
    } finally {
      setInRicerca(false);
    }
  };

  const aggiungiTrovato = async () => {
    if (!risultato || !utente || inAggiunta) return;
    setInAggiunta(true);
    try {
      await aggiungiVeicolo(risultato.targa, utente.id);
      await onAggiunto();
      onChiudi();
    } catch (err) {
      erroreAggiunta(err);
    } finally {
      setInAggiunta(false);
    }
  };

  const aggiungiManuale = async () => {
    if (inAggiunta) return;
    const problema = erroreForm(form);
    if (problema) {
      setCampoErrato(problema.campo);
      setErrore(problema.messaggio);
      return;
    }
    setCampoErrato(null);
    setErrore("");
    const body: NuovoVeicoloManuale = {
      targa: pulisciTarga(form.targa),
      tipo_veicolo: form.tipo_veicolo,
      marca: form.marca.trim(),
      modello: form.modello.trim(),
      dataimmatricolazione: form.dataimmatricolazione,
      alimentazione: form.alimentazione || undefined,
      cilindrata: intero(form.cilindrata),
      potenza_kw: intero(form.potenza_kw),
      numporte: intero(form.numporte),
      nomeassicurazione: form.nomeassicurazione.trim() || undefined,
      datascadenzarca: form.datascadenzarca || undefined,
      datascadenzabollo: form.datascadenzabollo || undefined,
    };
    setInAggiunta(true);
    try {
      await aggiungiVeicoloManuale(body);
      await onAggiunto();
      onChiudi();
    } catch (err) {
      erroreAggiunta(err);
    } finally {
      setInAggiunta(false);
    }
  };

  if (!aperto) return null;

  const campo = (nome: keyof FormManuale) => ({
    value: form[nome],
    className: `ov-in${campoErrato === nome ? " errato" : ""}${
      dallaFoto?.daVerificare.has(nome) ? " da-verificare" : dallaFoto?.letti.has(nome) ? " dalla-foto" : ""
    }`,
    onChange: (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [nome]: e.target.value }));
      // toccato dall'utente: non serve più evidenziarlo
      setDallaFoto((d) => {
        if (!d || (!d.letti.has(nome) && !d.daVerificare.has(nome))) return d;
        const letti = new Set(d.letti);
        const daVerificare = new Set(d.daVerificare);
        letti.delete(nome);
        daVerificare.delete(nome);
        return { letti, daVerificare };
      });
    },
  });
  const altroTipo = !TIPI_PRINCIPALI.some((t) => t.valore === form.tipo_veicolo);

  return (
    <Overlay
      onChiudi={onChiudi}
      titolo="Aggiungi un veicolo"
      icona="ti-car"
      bloccato={inAggiunta}
      sottotitolo={
        scheda === "cerca"
          ? "Cerca la targa: recuperiamo marca, modello e documenti. Se non la troviamo puoi inserire tu i dati."
          : scheda === "foto"
            ? "Fotografa il libretto: leggiamo i dati del veicolo e li trovi già scritti nel modulo, da controllare."
            : "Copia i dati dal libretto: accanto a ogni campo c'è il codice della riga dove trovarlo."
      }
      piede={
        scheda === "manuale" ? (
          <>
            <span className="ov-nota">
              <i className="ti ti-info-circle" />
              La revisione è calcolata dalla data di immatricolazione.
            </span>
            <button type="button" className="btn-dash btn-dash-ghost" disabled={inAggiunta} onClick={onChiudi}>
              Annulla
            </button>
            <button
              type="button"
              className="btn-dash btn-dash-primary"
              disabled={inAggiunta}
              onClick={() => void aggiungiManuale()}
            >
              <i className="ti ti-plus" />
              {inAggiunta ? "Aggiunta…" : "Aggiungi al garage"}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="ov-tabs" role="tablist">
        <button type="button" role="tab" aria-label="Cerca targa" aria-selected={scheda === "cerca"} className={scheda === "cerca" ? "on" : ""} onClick={() => cambiaScheda("cerca")}>
          <i className="ti ti-search" />
          <span>Cerca targa</span>
        </button>
        <button type="button" role="tab" aria-label="Inserisci a mano" aria-selected={scheda === "manuale"} className={scheda === "manuale" ? "on" : ""} onClick={() => cambiaScheda("manuale")}>
          <i className="ti ti-forms" />
          <span>Inserisci a mano</span>
        </button>
        <button type="button" role="tab" aria-label="Da foto libretto" aria-selected={scheda === "foto"} className={scheda === "foto" ? "on" : ""} onClick={() => cambiaScheda("foto")}>
          <i className="ti ti-camera" />
          <span>Da foto libretto</span>
        </button>
      </div>

      {errore && (
        <p className="ov-err" role="alert">
          <i className="ti ti-alert-circle" />
          {errore}
        </p>
      )}

      {scheda === "foto" ? (
        <LibrettoFoto onLetto={compilaDaFoto} />
      ) : scheda === "cerca" ? (
        <>
          <form className="av2-cerca" onSubmit={(e) => void cerca(e)}>
            <input
              className="ov-in av2-targa"
              placeholder="AA123BB"
              maxLength={9}
              value={targa}
              autoFocus
              aria-label="Targa"
              onChange={(e) => setTarga(e.target.value.toUpperCase())}
            />
            <button type="submit" className="btn-dash btn-dash-primary" disabled={inRicerca || !targa.trim()}>
              <i className="ti ti-search" />
              {inRicerca ? "Ricerca…" : "Cerca"}
            </button>
          </form>

          {nonTrovato && (
            <div className="av2-vuoto">
              <i className="ti ti-car-off" />
              <div>
                <b>Nessun dato per {pulisciTarga(targa)}</b>
                <span>Puoi aggiungerlo comunque copiando i dati dal libretto.</span>
              </div>
              <button
                type="button"
                className="btn-dash btn-dash-soft"
                onClick={() => {
                  setForm((f) => ({ ...f, targa: pulisciTarga(targa) }));
                  cambiaScheda("manuale");
                }}
              >
                <i className="ti ti-forms" />
                Inserisci a mano
              </button>
            </div>
          )}

          {risultato && (
            <div className="av2-risultato">
              <div className="av2-ris-top">
                <span className="targa-it targa-it--mini">
                  <span className="targa-it-eu">I</span>
                  <span className="targa-it-num">{risultato.targa}</span>
                </span>
                <b>{`${risultato.marca ?? ""} ${risultato.modello ?? ""}`.trim() || "Veicolo"}</b>
              </div>
              <div className="ov-grid av2-dati">
                <div className="ov-f"><span className="ov-lbl">Tipo</span><b>{risultato.tipo_veicolo ?? "—"}</b></div>
                <div className="ov-f"><span className="ov-lbl">Alimentazione</span><b>{risultato.alimentazione ?? "—"}</b></div>
                <div className="ov-f"><span className="ov-lbl">Potenza</span><b>{risultato.cavalli ? `${risultato.cavalli} CV` : "—"}</b></div>
                <div className="ov-f"><span className="ov-lbl">Anno</span><b>{risultato.anno ?? "—"}</b></div>
                <div className="ov-f w2">
                  <span className="ov-lbl">Bollo</span>
                  <b className={risultato.isbolloattivo ? "ok" : "ko"}>{risultato.isbolloattivo ? "Attivo" : "Scaduto"}</b>
                </div>
                <div className="ov-f w2">
                  <span className="ov-lbl">Assicurazione</span>
                  <b className={risultato.isinsured ? "ok" : "ko"}>{risultato.isinsured ? "Attiva" : "Scaduta"}</b>
                </div>
              </div>
              <button
                type="button"
                className="btn-dash btn-dash-primary av2-aggiungi"
                disabled={inAggiunta}
                onClick={() => void aggiungiTrovato()}
              >
                <i className="ti ti-plus" />
                {inAggiunta ? "Aggiunta in corso…" : "Aggiungi al garage"}
              </button>
            </div>
          )}

          {storico.length > 0 && (
            <>
              <div className="ov-grp">Cercate di recente</div>
              <div className="ov-seg chips av2-recenti">
                {storico.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTarga(t);
                      void cerca(undefined, t);
                    }}
                  >
                    {t}
                    <i
                      className="ti ti-x"
                      role="button"
                      aria-label={`Rimuovi ${t}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStorico(rimuoviStoricoTarga(t));
                      }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void aggiungiManuale();
          }}
        >
          {dallaFoto && dallaFoto.letti.size > 0 && (
            <p className="av2-foto-nota">
              <i className="ti ti-camera-check" />
              <span>
                Letti dalla foto <b>{dallaFoto.letti.size}</b> campi: controllali prima di salvare
                {dallaFoto.daVerificare.size > 0 && <>, soprattutto quelli in arancione (dedotti senza il codice della riga)</>}
                .
              </span>
            </p>
          )}
          <div className="ov-grp">Veicolo</div>
          <div className="ov-grid">
            <div className="ov-f w2">
              <span className="ov-lbl">Tipo</span>
              <div className="ov-seg av2-tipi">
                {TIPI_PRINCIPALI.map((t) => (
                  <button
                    key={t.valore}
                    type="button"
                    className={form.tipo_veicolo === t.valore ? "on" : ""}
                    onClick={() => setForm((f) => ({ ...f, tipo_veicolo: t.valore }))}
                  >
                    <i className={`ti ${t.icona}`} />
                    {t.etichetta}
                  </button>
                ))}
                <select
                  className={`ov-in av2-altro${altroTipo ? " on" : ""}`}
                  value={altroTipo ? form.tipo_veicolo : ""}
                  aria-label="Altro tipo di veicolo"
                  onChange={(e) => e.target.value && setForm((f) => ({ ...f, tipo_veicolo: e.target.value }))}
                >
                  <option value="">Altro…</option>
                  {ALTRI_TIPI.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ov-f">
              <label htmlFor="av-targa">Targa <code>A</code></label>
              <input id="av-targa" placeholder="AA123BB" maxLength={9} {...campo("targa")} onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value.toUpperCase() }))} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-imm">1ª immatricolazione <code>B</code></label>
              <input id="av-imm" type="date" max={new Date().toISOString().slice(0, 10)} {...campo("dataimmatricolazione")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-marca">Marca <code>D.1</code></label>
              <input id="av-marca" placeholder="Fiat" maxLength={30} {...campo("marca")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-modello">Modello <code>D.3</code></label>
              <input id="av-modello" placeholder="Panda" maxLength={40} {...campo("modello")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-alim">Alimentazione <code>P.3</code></label>
              <select id="av-alim" {...campo("alimentazione")}>
                <option value="">—</option>
                {ALIMENTAZIONI.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="ov-f">
              <label htmlFor="av-cc">Cilindrata cc <code>P.1</code></label>
              <input id="av-cc" type="number" inputMode="numeric" min={1} placeholder="1242" {...campo("cilindrata")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-kw">Potenza kW <code>P.2</code></label>
              <input id="av-kw" type="number" inputMode="numeric" min={1} placeholder="51" {...campo("potenza_kw")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-porte">Porte</label>
              <input id="av-porte" type="number" inputMode="numeric" min={1} max={9} placeholder="5" {...campo("numporte")} />
            </div>
          </div>

          <div className="ov-grp">
            Scadenze <span>· facoltative, le puoi aggiungere dopo</span>
          </div>
          <div className="ov-grid">
            <div className="ov-f w2">
              <label htmlFor="av-ass">Compagnia assicurativa</label>
              <input id="av-ass" placeholder="UnipolSai" maxLength={50} {...campo("nomeassicurazione")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-rca">Scadenza RCA</label>
              <input id="av-rca" type="date" {...campo("datascadenzarca")} />
            </div>
            <div className="ov-f">
              <label htmlFor="av-bollo">Scadenza bollo</label>
              <input id="av-bollo" type="date" {...campo("datascadenzabollo")} />
            </div>
          </div>
          {/* invio con Enter */}
          <button type="submit" hidden />
        </form>
      )}
    </Overlay>
  );
}
