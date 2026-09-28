/**
 * Percorso stradale disegnato sulla mappa delle prenotazioni.
 *
 * Usa il protocollo OSRM su dati OpenStreetMap: per default il server
 * pubblico della FOSSGIS (lo stesso di openstreetmap.org), gratuito e senza
 * chiave ma con una policy di uso moderato. Per la produzione basta puntare
 * NEXT_PUBLIC_ROUTING_URL a un altro server con la stessa API (un proprio
 * OSRM, o un servizio compatibile) senza toccare il codice.
 */
const ROUTING_URL =
  process.env.NEXT_PUBLIC_ROUTING_URL ?? "https://routing.openstreetmap.de/routed-car/route/v1/driving";

export interface Punto {
  lat: number;
  lng: number;
}

export interface Percorso {
  /** Coordinate [lat, lng] pronte per L.polyline. */
  linea: [number, number][];
  distanzaKm: number;
  durataMin: number;
}

interface RispostaOsrm {
  code: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

export async function calcolaPercorso(da: Punto, a: Punto, signal?: AbortSignal): Promise<Percorso> {
  const url = `${ROUTING_URL}/${da.lng},${da.lat};${a.lng},${a.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Routing non disponibile (${res.status})`);
  const dati = (await res.json()) as RispostaOsrm;
  const r = dati.routes?.[0];
  if (dati.code !== "Ok" || !r) throw new Error("Nessun percorso trovato");
  return {
    // GeoJSON è [lng, lat], Leaflet vuole [lat, lng]
    linea: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanzaKm: r.distance / 1000,
    durataMin: Math.round(r.duration / 60),
  };
}

export function formattaDurata(min: number): string {
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
