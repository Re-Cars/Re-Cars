import { logoutOfficina as apiLogoutOfficina, logoutServer } from "./api";
import {
  getUtenteLoggato,
  removeUtenteLoggato,
  removeVeicoloAttivo,
  setUtenteLoggato,
} from "./storage";
import type { UtenteLoggato } from "./types";

/**
 * Il JWT vero vive nel cookie httpOnly `access_token` impostato dal backend
 * (dominio del backend, invisibile al middleware Next). Questo cookie "flag",
 * NON httpOnly e sul dominio del frontend, serve solo al middleware per
 * decidere i redirect delle route protette.
 */
export const SESSION_COOKIE = "rc_session";
// 30 giorni come il JWT (Backend/src/auth-cookie.util.ts): l'accesso resta salvato sul dispositivo
const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Valore del flag: "u" utente, "o" officina. Serve al middleware per aprire
 * direttamente la home giusta a chi ha già fatto l'accesso. Le officine non
 * hanno username né tipo (privato/azienda), gli utenti sì.
 */
function setSessionCookie(profilo: UtenteLoggato): void {
  if (typeof document === "undefined") return;
  const tipo = profilo.username !== undefined || profilo.tipo !== undefined ? "u" : "o";
  document.cookie = `${SESSION_COOKIE}=${tipo}; path=/; max-age=${SESSION_COOKIE_MAX_AGE}; samesite=lax`;
}

function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

/** Salva il profilo dopo login/registrazione e marca la sessione per il middleware. */
export function salvaSessione(utente: UtenteLoggato): void {
  setUtenteLoggato(utente);
  setSessionCookie(utente);
}

export function isLoggato(): boolean {
  return getUtenteLoggato() !== null;
}

export function getUtente(): UtenteLoggato | null {
  return getUtenteLoggato();
}

/**
 * Logout completo: invalida il cookie httpOnly lato server, poi pulisce lo
 * stato locale (stesse chiavi rimosse dal vanilla `logout()`).
 */
export async function logout(): Promise<void> {
  try {
    await logoutServer();
  } catch (err) {
    console.error("Errore durante il logout sul server:", err);
  } finally {
    removeUtenteLoggato();
    removeVeicoloAttivo();
    clearSessionCookie();
  }
}

/** Logout dell'officina: endpoint dedicato POST /officina/logout (functions-officina-common.js). */
export async function logoutOfficina(): Promise<void> {
  try {
    await apiLogoutOfficina();
  } catch (err) {
    console.error("Errore durante il logout officina:", err);
  } finally {
    removeUtenteLoggato();
    clearSessionCookie();
  }
}
