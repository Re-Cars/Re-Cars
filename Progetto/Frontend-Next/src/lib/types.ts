/** Tipi condivisi ricavati dalle risposte del backend NestJS. */

export type TipoUtente = "privato" | "azienda";
export type PianoUtente = "base" | "premium" | "pro";

export interface Abbonamento {
  id: number;
  piano: PianoUtente | string;
  data_inizio?: string | null;
  data_fine?: string | null;
}

/** Profilo salvato in localStorage dopo login/registrazione (utente o officina). */
export interface UtenteLoggato {
  id: number;
  username?: string;
  email?: string;
  tipo?: TipoUtente | string;
  ragione_sociale?: string;
  partita_iva?: string;
  nome?: string;
  avatar?: string | null;
  piano?: string;
}

/** Profilo completo restituito da GET /auth/utente/:id */
export interface ProfiloUtente extends UtenteLoggato {
  cellulare?: string | null;
  abbonamento?: Abbonamento[];
}

export interface DatiGenerici {
  tipo_veicolo?: string;
  alimentazione?: string;
  cilindrata?: number | null;
  cavalli?: number | null;
}

export interface DatiSpecifici {
  dataimmatricolazione?: string | null;
  datascadenzabollo?: string | null;
  isbolloattivo?: boolean;
  datascadenzarca?: string | null;
  isinsured?: boolean;
  nomeassicurazione?: string | null;
}

/** Veicolo completo restituito da GET /veicolo/:id */
export interface VeicoloDettaglio {
  id: number;
  targa: string;
  marca?: string;
  modello?: string;
  dati_generici: DatiGenerici[];
  dati_specifici: DatiSpecifici[];
}

/** Voce compatta usata da switcher / lista veicoli. */
export interface VeicoloCompatto {
  id: number;
  nome: string;
  targa: string;
  tipo: "car" | "motorcycle";
}

/** Risultato di GET /veicolo/cerca/:targa */
export interface RisultatoRicercaVeicolo {
  targa: string;
  marca?: string;
  modello?: string;
  alimentazione?: string;
  cavalli?: number | null;
  tipo_veicolo?: string;
  /** Non fornito dal mock backend attuale; opzionale per il box risultato. */
  anno?: number | null;
  isbolloattivo?: boolean;
  isinsured?: boolean;
}

export interface Citta {
  sigla: string;
  nome: string;
}

/* ====================== OFFICINA ====================== */

export type StatoPrenotazione = "in_attesa" | "confermata" | "annullata" | "completata";

/** Prenotazione come vista dall'officina (utente + veicolo inclusi). */
export interface PrenotazioneOfficina {
  id: number;
  dataprenotazione: string;
  stato: StatoPrenotazione | string;
  descrizione?: string | null;
  servizio?: string | null;
  utente?: {
    username?: string;
    email?: string;
    cellulare?: string | null;
    veicolo?: VeicoloDettaglio[];
  };
}

export interface DashboardOfficina {
  oggiTotale?: number;
  oggiConfermate?: number;
  settimanaT?: number;
  settimanaAttesa?: number;
  pontiOccupati?: number;
  abbonamento?: Abbonamento | null;
  prenotazioniOggi?: PrenotazioneOfficina[];
}

export interface ProfiloOfficina {
  id: number;
  nome?: string;
  ragione_sociale?: string;
  partita_iva?: string;
  codice_sdi?: string | null;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  sigla_citta?: string;
  ponti_disponibili?: number | null;
  tipi?: string[];
  abbonamento?: Abbonamento[];
}

export interface StatsOfficina {
  totale: number;
  mese: number;
  mesePrecedente: number;
  completate: number;
  tassoCompletamento: number;
}

export interface ProfiloOfficinaResponse {
  officina: ProfiloOfficina;
  stats: StatsOfficina;
}

/** Officina come appare nel catalogo GET /officina/all (pagina prenotazioni utente). */
export interface OfficinaCatalogo {
  id: number;
  nome?: string;
  specialita?: string;
  categoria?: string;
  stelle?: number | string;
  recensioni?: number | string;
  distanza_km?: number | string;
  aperta?: boolean;
  orario?: string;
  disponibilita?: string;
  indirizzo?: string;
  telefono?: string;
  latitude?: number | string;
  lat?: number | string;
  longitude?: number | string;
  lng?: number | string;
  servizi?: string[] | string;
}

/* ====================== STORICO INTERVENTI ====================== */

export type CategoriaIntervento = "ordinario" | "straordinario" | "gestione" | "annotazioni";

export interface Intervento {
  id: number;
  id_veicolo?: number;
  data: string;
  categoria: CategoriaIntervento;
  nome: string;
  descrizione?: string | null;
  mediante?: string | null;
  costo?: number | string | null;
}

export interface NuovoInterventoBody {
  id_veicolo: number;
  data: string;
  categoria: CategoriaIntervento;
  nome: string;
  descrizione: string | null;
  mediante: string | null;
  costo: number | null;
}
