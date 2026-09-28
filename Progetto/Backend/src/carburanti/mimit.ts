/**
 * Open data MIMIT "Osservaprezzi carburanti" (licenza IODL 2.0): ogni mattina
 * il Ministero pubblica due CSV, l'anagrafica degli impianti attivi e i
 * prezzi comunicati alle 8:00. Prima riga "Estrazione del AAAA-MM-GG", poi
 * l'intestazione; separatore "|" (in passato ";": si riconosce da solo).
 *
 *   anagrafica: idImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
 *   prezzi:     idImpianto|descCarburante|prezzo|isSelf|dtComu
 */

export const CARBURANTI = ['benzina', 'gasolio', 'gpl', 'metano'] as const;
export type Carburante = (typeof CARBURANTI)[number];

export interface Prezzo {
  self?: number;
  servito?: number;
  /** Data e ora della comunicazione del gestore (testo del CSV). */
  aggiornato?: string;
}

export interface Impianto {
  id: number;
  bandiera: string;
  nome: string;
  indirizzo: string;
  comune: string;
  provincia: string;
  lat: number;
  lng: number;
  prezzi: Partial<Record<Carburante, Prezzo>>;
}

interface TabellaCsv {
  estrazione: string | null;
  righe: Record<string, string>[];
}

/** CSV del MIMIT → righe indicizzate per nome di colonna (minuscolo). */
export function leggiCsv(testo: string): TabellaCsv {
  // eventuale BOM iniziale del file
  const senzaBom = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo;
  const linee = senzaBom.split(/\r?\n/);
  let estrazione: string | null = null;
  let i = 0;
  const data = linee[0]?.match(/estrazione del\s+(\d{4}-\d{2}-\d{2})/i);
  if (data) {
    estrazione = data[1];
    i = 1;
  }
  const intestazione = linee[i] ?? '';
  const sep =
    (intestazione.match(/\|/g)?.length ?? 0) >=
    (intestazione.match(/;/g)?.length ?? 0)
      ? '|'
      : ';';
  const colonne = intestazione.split(sep).map((c) => c.trim().toLowerCase());
  const righe: Record<string, string>[] = [];
  for (const linea of linee.slice(i + 1)) {
    if (!linea.trim()) continue;
    const valori = linea.split(sep);
    // un separatore dentro un campo di testo sposterebbe le colonne: la riga si scarta
    if (valori.length !== colonne.length) continue;
    righe.push(
      Object.fromEntries(colonne.map((c, k) => [c, valori[k].trim()])),
    );
  }
  return { estrazione, righe };
}

/** "Benzina", "Gasolio", "GPL", "Metano"; le varianti premium si ignorano. */
export function carburanteDa(desc: string): Carburante | null {
  const d = desc.trim().toLowerCase();
  if (d === 'benzina') return 'benzina';
  if (d === 'gasolio') return 'gasolio';
  if (d === 'gpl') return 'gpl';
  if (d === 'metano') return 'metano';
  return null;
}

const numero = (s: string | undefined) => Number((s ?? '').replace(',', '.'));

export function unisciDati(anagrafica: string, prezzi: string) {
  const a = leggiCsv(anagrafica);
  const impianti = new Map<number, Impianto>();
  for (const r of a.righe) {
    const id = numero(r['idimpianto']);
    const lat = numero(r['latitudine']);
    const lng = numero(r['longitudine']);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    // coordinate mancanti o fuori dall'Italia: l'impianto non si può mettere in mappa
    if (lat < 35 || lat > 48 || lng < 6 || lng > 19) continue;
    impianti.set(id, {
      id,
      bandiera: r['bandiera'] || 'Pompe bianche',
      nome: r['nome impianto'] || r['gestore'] || '',
      indirizzo: r['indirizzo'] || '',
      comune: r['comune'] || '',
      provincia: r['provincia'] || '',
      lat,
      lng,
      prezzi: {},
    });
  }
  const p = leggiCsv(prezzi);
  for (const r of p.righe) {
    const impianto = impianti.get(numero(r['idimpianto']));
    const carburante = carburanteDa(r['desccarburante'] ?? '');
    const prezzo = numero(r['prezzo']);
    if (!impianto || !carburante || !(prezzo > 0.3 && prezzo < 5)) continue;
    const voce = (impianto.prezzi[carburante] ??= {});
    const self = r['isself'] === '1';
    // più righe per lo stesso carburante (es. due erogatori): vale la più bassa
    const chiave = self ? 'self' : 'servito';
    if (voce[chiave] === undefined || prezzo < voce[chiave])
      voce[chiave] = prezzo;
    voce.aggiornato = r['dtcomu'] || voce.aggiornato;
  }
  return {
    estrazione: p.estrazione ?? a.estrazione,
    impianti: [...impianti.values()].filter(
      (i) => Object.keys(i.prezzi).length > 0,
    ),
  };
}

/** Distanza in km (formula dell'emisenoverso). */
export function distanzaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
