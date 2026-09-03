/**
 * Utility geografiche lato client. Il backend (`GET /officina/all`) non
 * restituisce alcuna distanza: viene calcolata qui confrontando la
 * posizione GPS dell'utente con le coordinate dell'officina.
 */

/** Distanza in chilometri tra due coordinate (formula dell'emisenoverso). */
export function distanzaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distanza formattata per la UI ("1,4 km" / "12 km"). */
export function formattaKm(km: number): string {
  return `${km.toLocaleString("it-IT", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
