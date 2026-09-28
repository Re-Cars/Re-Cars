import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  distanzaKm,
  unisciDati,
  type Carburante,
  type Impianto,
} from './mimit';

const URL_ANAGRAFICA =
  'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv';
const URL_PREZZI =
  'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv';
/** I dati escono una volta al giorno: si riscaricano al massimo ogni 6 ore. */
const DURATA_MS = 6 * 3600 * 1000;

export interface ImpiantoVicino {
  id: number;
  bandiera: string;
  nome: string;
  indirizzo: string;
  comune: string;
  provincia: string;
  lat: number;
  lng: number;
  /** €/litro (€/kg per il metano): self se c'è, altrimenti servito. */
  prezzo: number;
  self: boolean;
  aggiornato: string | null;
  distanzaKm: number;
}

interface Dati {
  estrazione: string | null;
  impianti: Impianto[];
  caricatiIl: number;
}

/**
 * Prezzi dei carburanti dagli open data del Ministero, tenuti in memoria
 * (circa 20.000 impianti: niente tabelle nel database). Il primo download
 * parte all'avvio senza bloccarlo; se un aggiornamento fallisce si continua
 * con i dati precedenti.
 */
@Injectable()
export class CarburantiService implements OnModuleInit {
  private readonly logger = new Logger('Carburanti');
  private dati: Dati | null = null;
  private inCarica: Promise<Dati> | null = null;
  private readonly urlAnagrafica: string;
  private readonly urlPrezzi: string;

  constructor(config: ConfigService) {
    this.urlAnagrafica =
      config.get<string>('CARBURANTI_URL_ANAGRAFICA') ?? URL_ANAGRAFICA;
    this.urlPrezzi = config.get<string>('CARBURANTI_URL_PREZZI') ?? URL_PREZZI;
  }

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.aggiorna().catch(() => undefined);
  }

  private async scarica(url: string): Promise<string> {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.text();
  }

  /** Scarica e unisce i due CSV (una sola volta anche con più richieste insieme). */
  private aggiorna(): Promise<Dati> {
    this.inCarica ??= (async () => {
      try {
        const [anagrafica, prezzi] = await Promise.all([
          this.scarica(this.urlAnagrafica),
          this.scarica(this.urlPrezzi),
        ]);
        const { estrazione, impianti } = unisciDati(anagrafica, prezzi);
        if (impianti.length === 0) throw new Error('CSV senza impianti');
        this.dati = { estrazione, impianti, caricatiIl: Date.now() };
        this.logger.log(
          `Prezzi carburanti aggiornati: ${impianti.length} impianti (estrazione ${estrazione ?? 'n.d.'})`,
        );
        return this.dati;
      } catch (err) {
        this.logger.warn(
          `Aggiornamento prezzi carburanti non riuscito: ${err instanceof Error ? err.message : String(err)}`,
        );
        throw err;
      } finally {
        this.inCarica = null;
      }
    })();
    return this.inCarica;
  }

  private async datiAttuali(): Promise<Dati> {
    if (this.dati && Date.now() - this.dati.caricatiIl < DURATA_MS) {
      return this.dati;
    }
    try {
      return await this.aggiorna();
    } catch {
      if (this.dati) return this.dati; // meglio i prezzi di ieri che niente
      throw new ServiceUnavailableException(
        'Prezzi dei carburanti non disponibili al momento, riprova più tardi.',
      );
    }
  }

  /** Impianti entro `raggio` km che vendono il carburante, dal più economico. */
  async vicini(
    lat: number,
    lng: number,
    carburante: Carburante,
    raggio = 5,
    limite = 10,
  ) {
    const dati = await this.datiAttuali();
    const risultati: ImpiantoVicino[] = [];
    for (const i of dati.impianti) {
      const prezzo = i.prezzi[carburante];
      if (!prezzo) continue;
      // taglio grossolano prima della formula: 1° di latitudine ≈ 111 km
      if (Math.abs(i.lat - lat) > raggio / 100) continue;
      const km = distanzaKm(lat, lng, i.lat, i.lng);
      if (km > raggio) continue;
      const self = prezzo.self !== undefined;
      risultati.push({
        id: i.id,
        bandiera: i.bandiera,
        nome: i.nome,
        indirizzo: i.indirizzo,
        comune: i.comune,
        provincia: i.provincia,
        lat: i.lat,
        lng: i.lng,
        prezzo: (self ? prezzo.self : prezzo.servito) as number,
        self,
        aggiornato: prezzo.aggiornato ?? null,
        distanzaKm: Math.round(km * 10) / 10,
      });
    }
    risultati.sort(
      (a, b) => a.prezzo - b.prezzo || a.distanzaKm - b.distanzaKm,
    );
    return {
      estrazione: dati.estrazione,
      carburante,
      raggio,
      impianti: risultati.slice(0, limite),
    };
  }
}
