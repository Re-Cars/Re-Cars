import type {
  Citta,
  DashboardOfficina,
  Intervento,
  NuovoInterventoBody,
  OfficinaCatalogo,
  PrenotazioneOfficina,
  ProfiloOfficina,
  ProfiloOfficinaResponse,
  ProfiloUtente,
  RisultatoRicercaVeicolo,
  UtenteLoggato,
  VeicoloDettaglio,
} from "./types";

/**
 * Layer API centralizzato. Il browser chiama sempre /api/... sul dominio del
 * sito e Next inoltra al backend (rewrites in next.config.ts, destinazione
 * NEXT_PUBLIC_API_URL). Così il cookie httpOnly `access_token` è di prima
 * parte: Safari (e ogni browser che blocca i cookie di terze parti) lo
 * scartava quando il backend stava su un altro dominio, e dopo il login la
 * prima chiamata tornava 401 riportando alla landing.
 */
const API_BASE_URL = "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function estraiMessaggio(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const message = (data as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message[0] ?? null;
  return message ?? null;
}

/**
 * Logga il dettaglio completo di un errore di chiamata API sulla console,
 * senza silenziarlo dietro un messaggio generico per l'utente. Distingue
 * gli errori di rete (fetch rifiutata prima ancora di arrivare al server —
 * tipicamente CORS bloccato dal browser, backend giù, o URL sbagliato: in
 * questo caso `err` è un `TypeError: Failed to fetch` senza `status`) dagli
 * `ApiError` con risposta HTTP effettivamente ricevuta dal backend.
 */
export function logApiError(contesto: string, err: unknown): void {
  if (err instanceof ApiError) {
    console.error(`[${contesto}] ApiError`, {
      status: err.status,
      message: err.message,
    });
    return;
  }
  if (err instanceof Error) {
    console.error(`[${contesto}] Errore di rete/CORS (nessuna risposta HTTP ricevuta)`, {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    return;
  }
  console.error(`[${contesto}] Errore non standard`, err);
}

/**
 * Wrapper di fetch: aggiunge sempre `credentials: 'include'` (il JWT vive
 * nel cookie httpOnly `access_token`) e `Content-Type: application/json`
 * quando c'è un body. Lancia ApiError su risposta non-2xx.
 */
export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, estraiMessaggio(data) ?? `Errore ${response.status}`);
  }

  return data as T;
}

/* ====================== AUTH ====================== */

export interface RegistrazionePrivatoBody {
  username: string;
  email: string;
  password: string;
  tipo: "privato";
}

export interface RegistrazioneAziendaBody {
  username: string;
  email: string;
  password: string;
  tipo: "azienda";
  ragione_sociale: string;
  partita_iva: string;
  codice_sdi: string | null;
}

export interface RegistrazioneOfficinaBody {
  email: string;
  password: string;
  nome: string;
  ragione_sociale: string;
  partita_iva: string;
  codice_sdi: string | null;
  telefono: string;
  indirizzo: string;
  sigla_citta: string;
}

export function loginUtente(email: string, password: string): Promise<{ utente: UtenteLoggato }> {
  return fetchApi("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function loginAzienda(partitaIva: string, password: string): Promise<{ utente: UtenteLoggato }> {
  return fetchApi("/auth/login/azienda", {
    method: "POST",
    body: JSON.stringify({ partita_iva: partitaIva, password }),
  });
}

export function loginOfficina(partitaIva: string, password: string): Promise<{ officina: UtenteLoggato }> {
  return fetchApi("/officina/login", {
    method: "POST",
    body: JSON.stringify({ partita_iva: partitaIva, password }),
  });
}

export function registraUtente(
  body: RegistrazionePrivatoBody | RegistrazioneAziendaBody,
): Promise<{ utente: UtenteLoggato }> {
  return fetchApi("/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export function registraOfficina(body: RegistrazioneOfficinaBody): Promise<{ officina: UtenteLoggato }> {
  return fetchApi("/officina/register", { method: "POST", body: JSON.stringify(body) });
}

export function logoutServer(): Promise<unknown> {
  return fetchApi("/auth/logout", { method: "POST" });
}

export function getProfiloUtente(id: number): Promise<ProfiloUtente> {
  return fetchApi(`/auth/utente/${id}`);
}

export function aggiornaUtente(id: number, patch: Partial<ProfiloUtente>): Promise<ProfiloUtente> {
  return fetchApi(`/auth/utente/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function eliminaAccount(id: number): Promise<unknown> {
  return fetchApi(`/auth/utente/${id}`, { method: "DELETE" });
}

export function cercaCitta(query: string): Promise<Citta[]> {
  return fetchApi(`/citta?q=${encodeURIComponent(query)}`);
}

/* ====================== VEICOLI ====================== */

export function getVeicoliUtente(idUtente: number): Promise<VeicoloDettaglio[]> {
  return fetchApi(`/veicolo/utente/${idUtente}`);
}

export function getVeicolo(id: number): Promise<VeicoloDettaglio> {
  return fetchApi(`/veicolo/${id}`);
}

export function cercaVeicoloPerTarga(targa: string): Promise<RisultatoRicercaVeicolo> {
  return fetchApi(`/veicolo/cerca/${targa}`);
}

/** Dati del libretto inseriti a mano: POST /veicolo/manuale (tra parentesi la riga del libretto). */
export interface NuovoVeicoloManuale {
  targa: string; // (A)
  tipo_veicolo: string;
  marca: string; // (D.1)
  modello: string; // (D.3)
  dataimmatricolazione: string; // (B) AAAA-MM-GG
  alimentazione?: string; // (P.3)
  cilindrata?: number; // (P.1) cc
  potenza_kw?: number; // (P.2)
  numporte?: number;
  nomeassicurazione?: string;
  datascadenzarca?: string;
  datascadenzabollo?: string;
}

export function aggiungiVeicoloManuale(body: NuovoVeicoloManuale): Promise<unknown> {
  return fetchApi("/veicolo/manuale", { method: "POST", body: JSON.stringify(body) });
}

export function aggiungiVeicolo(targa: string, idUtente: number): Promise<unknown> {
  return fetchApi("/veicolo", {
    method: "POST",
    body: JSON.stringify({ targa, id_utente: idUtente }),
  });
}

export function eliminaVeicolo(id: number): Promise<unknown> {
  return fetchApi(`/veicolo/${id}`, { method: "DELETE" });
}

/* ====================== ABBONAMENTI / STRIPE ====================== */

export function getAbbonamento(idUtente: number): Promise<ProfiloUtente> {
  // il piano attivo arriva insieme al profilo (campo abbonamento[])
  return getProfiloUtente(idUtente);
}

export function avviaCheckoutStripe(
  piano: string,
  idUtente: number,
  baseUrl: string,
): Promise<{ url: string }> {
  return fetchApi("/abbonamento/checkout", {
    method: "POST",
    body: JSON.stringify({ piano, id_utente: idUtente, baseUrl }),
  });
}

/** "Passa a Gratis": spegne il rinnovo, Premium resta fino a fine periodo pagato. */
export function disdiciAbbonamento(): Promise<{ message: string; dataFine?: string | null }> {
  return fetchApi("/abbonamento/disdici", { method: "POST" });
}

export interface StatoAbbonamento {
  piano: string;
  /** null: abbonamento senza Stripe (nessun rinnovo da gestire). */
  rinnovoAutomatico: boolean | null;
  /** Solo con rinnovo spento: giorno in cui si torna a Gratis. */
  dataFine: string | null;
  prossimoRinnovo: string | null;
  /** true se c'è un abbonamento Stripe (rinnovo e portale disponibili). */
  gestibile: boolean;
}

export function getStatoAbbonamento(): Promise<StatoAbbonamento> {
  return fetchApi("/abbonamento/stato");
}

export function impostaRinnovoAutomatico(automatico: boolean): Promise<StatoAbbonamento> {
  return fetchApi("/abbonamento/rinnovo", {
    method: "POST",
    body: JSON.stringify({ automatico }),
  });
}

/** Portale Stripe: cambio carta e fatture. */
export function apriPortalePagamento(baseUrl: string): Promise<{ url: string }> {
  return fetchApi("/abbonamento/portale", {
    method: "POST",
    body: JSON.stringify({ baseUrl }),
  });
}

/**
 * Checkout per i piani officina: stesso endpoint ma senza id_utente nel body
 * (il backend ricava l'officina dal JWT), come in functions-abbonamenti-officina.js.
 */
export function avviaCheckoutStripeOfficina(piano: string, baseUrl: string): Promise<{ url: string }> {
  return fetchApi("/abbonamento/checkout", {
    method: "POST",
    body: JSON.stringify({ piano, baseUrl }),
  });
}

/* ====================== AREA OFFICINA ====================== */

export function logoutOfficina(): Promise<unknown> {
  return fetchApi("/officina/logout", { method: "POST" });
}

export function getDashboardOfficina(): Promise<DashboardOfficina> {
  return fetchApi("/officina/dashboard");
}

export function getPrenotazioniOfficina(): Promise<PrenotazioneOfficina[]> {
  return fetchApi("/officina/prenotazioni");
}

export function getAgendaOfficina(anno: number, mese: number): Promise<PrenotazioneOfficina[]> {
  return fetchApi(`/officina/agenda?anno=${anno}&mese=${mese}`);
}

export function getProfiloOfficina(): Promise<ProfiloOfficinaResponse> {
  return fetchApi("/officina/profilo");
}

export function aggiornaProfiloOfficina(
  patch: Partial<ProfiloOfficina> & { password?: string },
): Promise<ProfiloOfficina> {
  return fetchApi("/officina/profilo", { method: "PATCH", body: JSON.stringify(patch) });
}

export function eliminaProfiloOfficina(): Promise<unknown> {
  return fetchApi("/officina/profilo", { method: "DELETE" });
}

/**
 * Nota endpoint volutamente diversi (come nel vanilla): la dashboard usa
 * PATCH /prenotazioni/:id/stato, la lista PATCH /officina/prenotazioni/:id/stato.
 */
export function aggiornaStatoPrenotazione(id: number, stato: string): Promise<unknown> {
  return fetchApi(`/prenotazioni/${id}/stato`, {
    method: "PATCH",
    body: JSON.stringify({ stato }),
  });
}

export function aggiornaStatoPrenotazioneOfficina(id: number, stato: string): Promise<unknown> {
  return fetchApi(`/officina/prenotazioni/${id}/stato`, {
    method: "PATCH",
    body: JSON.stringify({ stato }),
  });
}

/* ====================== PRENOTAZIONI UTENTE ====================== */

export function getOfficineCatalogo(): Promise<OfficinaCatalogo[]> {
  return fetchApi("/officina/all");
}

export interface NuovaPrenotazioneBody {
  officinaId: number;
  servizio: string;
  data: string;
  orario: string;
  note: string;
}

export function creaPrenotazione(body: NuovaPrenotazioneBody): Promise<unknown> {
  return fetchApi("/prenotazioni", { method: "POST", body: JSON.stringify(body) });
}

/**
 * Riga di GET /prenotazioni: record Prisma `prenotazione` con relazione
 * `officina` inclusa. `descrizione` è costruita dal backend come
 * "Servizio: X" oppure "Servizio: X - Note: Y" (vedi PrenotazioniService.crea).
 */
export interface PrenotazioneUtente {
  id: number;
  dataprenotazione: string;
  descrizione?: string | null;
  stato?: string;
  id_officina?: number;
  officina?: {
    nome?: string;
    indirizzo?: string;
    telefono?: string;
  };
}

export function getPrenotazioniUtente(): Promise<PrenotazioneUtente[]> {
  return fetchApi("/prenotazioni");
}

/* ====================== STORICO INTERVENTI ====================== */

export function getInterventiVeicolo(idVeicolo: number): Promise<Intervento[]> {
  return fetchApi(`/interventi/veicolo/${idVeicolo}`);
}

export function creaIntervento(body: NuovoInterventoBody): Promise<Intervento> {
  return fetchApi("/interventi", { method: "POST", body: JSON.stringify(body) });
}

export function aggiornaIntervento(
  id: number,
  body: Omit<NuovoInterventoBody, "id_veicolo">,
): Promise<Intervento> {
  return fetchApi(`/interventi/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function eliminaIntervento(id: number): Promise<unknown> {
  return fetchApi(`/interventi/${id}`, { method: "DELETE" });
}

/* ====================== ASSISTENTE ====================== */

export type AzioneAssistente =
  | { tipo: "apri_pagina"; etichetta: string; href: string }
  | { tipo: "chiedi"; etichetta: string; domanda: string };

export type EventoAssistente =
  | { type: "delta"; text: string }
  | { type: "done"; answer: string; actions: AzioneAssistente[]; used_llm: boolean };

export interface RichiestaAssistente {
  messaggio: string;
  storico: { ruolo: "utente" | "assistente"; testo: string }[];
  pagina?: string;
}

/**
 * POST /assistente/chat: risposta in Server-Sent Events, letta un evento
 * alla volta. La chiave Gemini sta solo nel backend. Lancia ApiError sui
 * non-2xx (429 = troppe domande, col messaggio del backend).
 */
export async function* chatAssistente(
  body: RichiestaAssistente,
  signal?: AbortSignal,
): AsyncGenerator<EventoAssistente> {
  const response = await fetch(`${API_BASE_URL}/assistente/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    let messaggio: string | null = null;
    try {
      messaggio = estraiMessaggio(await response.json());
    } catch {
      /* corpo non JSON */
    }
    throw new ApiError(response.status, messaggio ?? `Errore ${response.status}`);
  }

  const lettore = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await lettore.read();
    if (done) break;
    buffer += value;
    let fine: number;
    while ((fine = buffer.indexOf("\n\n")) >= 0) {
      const blocco = buffer.slice(0, fine);
      buffer = buffer.slice(fine + 2);
      for (const riga of blocco.split("\n")) {
        if (!riga.startsWith("data:")) continue;
        try {
          yield JSON.parse(riga.slice(5).trim()) as EventoAssistente;
        } catch {
          /* evento malformato: si ignora */
        }
      }
    }
  }
}

/* ====================== NOTIFICHE PUSH ====================== */

/** Chiave VAPID pubblica del backend (503 se le notifiche non sono configurate). */
export function getChiaveNotifiche(): Promise<{ chiave: string }> {
  return fetchApi("/notifiche/chiave-pubblica");
}

export function iscriviNotifiche(iscrizione: PushSubscriptionJSON): Promise<unknown> {
  return fetchApi("/notifiche/iscrizione", {
    method: "POST",
    body: JSON.stringify({ endpoint: iscrizione.endpoint, keys: iscrizione.keys }),
  });
}

export function disiscriviNotifiche(endpoint: string): Promise<unknown> {
  return fetchApi("/notifiche/iscrizione", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}

export function notificaDiProva(): Promise<{ inviate: number }> {
  return fetchApi("/notifiche/prova", { method: "POST" });
}

/* ====================== CARBURANTI ====================== */

export type Carburante = "benzina" | "gasolio" | "gpl" | "metano";

/** Distributore di GET /carburanti/vicini (open data MIMIT, prezzi delle 8:00). */
export interface ImpiantoCarburante {
  id: number;
  bandiera: string;
  nome: string;
  indirizzo: string;
  comune: string;
  provincia: string;
  lat: number;
  lng: number;
  /** €/l (€/kg per il metano): self se disponibile, altrimenti servito. */
  prezzo: number;
  self: boolean;
  aggiornato: string | null;
  distanzaKm: number;
}

export interface RispostaCarburanti {
  estrazione: string | null;
  carburante: Carburante;
  raggio: number;
  impianti: ImpiantoCarburante[];
}

export function getCarburantiVicini(lat: number, lng: number, carburante: Carburante, raggio = 5): Promise<RispostaCarburanti> {
  const q = new URLSearchParams({ lat: lat.toFixed(5), lng: lng.toFixed(5), carburante, raggio: String(raggio) });
  return fetchApi(`/carburanti/vicini?${q}`);
}
