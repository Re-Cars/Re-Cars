import type { UtenteLoggato, VeicoloCompatto } from "./types";

/**
 * Accesso type-safe a localStorage.
 * Chiavi ereditate dal frontend vanilla (functions-base.js / functions-app.js):
 * i nomi restano identici per compatibilità con sessioni esistenti.
 */
export const STORAGE_KEYS = {
  utenteLoggato: "yd_utente_loggato",
  accessToken: "yd_access_token",
  avatar: "yd_avatar_img",
  veicoloAttivo: "veicoloAttivo",
  veicoloAttivoId: "veicoloAttivoId",
  theme: "theme",
  storicoTarghe: "storico_targhe",
  garageAnimation: "garage_animation",
  garageLimiteRaggiunto: "garage_limite_raggiunto",
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isBrowser = (): boolean => typeof window !== "undefined";

function getRaw(key: StorageKey): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

function setRaw(key: StorageKey, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

function getJson<T>(key: StorageKey): T | null {
  const raw = getRaw(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setJson(key: StorageKey, value: unknown): void {
  setRaw(key, JSON.stringify(value));
}

export function removeItem(key: StorageKey): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

/* ---------- utente loggato ---------- */

export function getUtenteLoggato(): UtenteLoggato | null {
  return getJson<UtenteLoggato>(STORAGE_KEYS.utenteLoggato);
}

export function setUtenteLoggato(utente: UtenteLoggato): void {
  setJson(STORAGE_KEYS.utenteLoggato, utente);
}

export function removeUtenteLoggato(): void {
  removeItem(STORAGE_KEYS.utenteLoggato);
}

/* ---------- access token (non usato dal flusso web, mantenuto per parità) ---------- */

export function getAccessToken(): string | null {
  return getRaw(STORAGE_KEYS.accessToken);
}

export function setAccessToken(token: string): void {
  setRaw(STORAGE_KEYS.accessToken, token);
}

/* ---------- avatar ---------- */

export function getAvatarSalvato(): string | null {
  return getRaw(STORAGE_KEYS.avatar);
}

export function setAvatarSalvato(base64: string): void {
  setRaw(STORAGE_KEYS.avatar, base64);
}

/* ---------- veicolo attivo ---------- */

export function getVeicoloAttivo(): VeicoloCompatto | null {
  return getJson<VeicoloCompatto>(STORAGE_KEYS.veicoloAttivo);
}

export function setVeicoloAttivo(veicolo: VeicoloCompatto): void {
  setJson(STORAGE_KEYS.veicoloAttivo, veicolo);
  setRaw(STORAGE_KEYS.veicoloAttivoId, String(veicolo.id));
}

export function getVeicoloAttivoId(): number | null {
  const raw = getRaw(STORAGE_KEYS.veicoloAttivoId);
  if (raw === null) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

export function removeVeicoloAttivo(): void {
  removeItem(STORAGE_KEYS.veicoloAttivo);
  removeItem(STORAGE_KEYS.veicoloAttivoId);
}

/* ---------- storico targhe cercate (max 5) ---------- */

export function getStoricoTarghe(): string[] {
  return getJson<string[]>(STORAGE_KEYS.storicoTarghe) ?? [];
}

export function salvaStoricoTarga(targa: string): string[] {
  const storico = [targa, ...getStoricoTarghe().filter((t) => t !== targa)].slice(0, 5);
  setJson(STORAGE_KEYS.storicoTarghe, storico);
  return storico;
}

export function rimuoviStoricoTarga(targa: string): string[] {
  const storico = getStoricoTarghe().filter((t) => t !== targa);
  setJson(STORAGE_KEYS.storicoTarghe, storico);
  return storico;
}

/* ---------- flag one-shot (animazione garage / limite piano) ---------- */

export function setGarageAnimation(): void {
  setRaw(STORAGE_KEYS.garageAnimation, "true");
}

export function consumaGarageAnimation(): boolean {
  const attivo = getRaw(STORAGE_KEYS.garageAnimation) === "true";
  if (attivo) removeItem(STORAGE_KEYS.garageAnimation);
  return attivo;
}

export function setGarageLimiteRaggiunto(): void {
  setRaw(STORAGE_KEYS.garageLimiteRaggiunto, "true");
}

export function consumaGarageLimiteRaggiunto(): boolean {
  const attivo = getRaw(STORAGE_KEYS.garageLimiteRaggiunto) === "true";
  if (attivo) removeItem(STORAGE_KEYS.garageLimiteRaggiunto);
  return attivo;
}

export function clearAll(): void {
  if (!isBrowser()) return;
  window.localStorage.clear();
}
