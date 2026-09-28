/** Tipi di veicolo del database (enum tipo_veicolo in schema.prisma). */
export const TIPI_VEICOLO = ["Autovettura", "Moto", "Scooter", "Autocarro", "Camper", "Autobus", "Quad"] as const;
export type TipoVeicolo = (typeof TIPI_VEICOLO)[number];

/** Moto e scooter: icona e colore "moto" in garage, scheda e selettori. */
export function dueRuote(tipo: string | null | undefined): boolean {
  const t = (tipo ?? "").toLowerCase();
  return t === "moto" || t === "scooter";
}
