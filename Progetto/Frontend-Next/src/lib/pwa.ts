"use client";

import { useSyncExternalStore } from "react";

import { disiscriviNotifiche, getChiaveNotifiche, iscriviNotifiche } from "@/lib/api";

/* ---------------- installazione ---------------- */

/** Evento non standard di Chrome/Edge/Android per il prompt di installazione. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let promptInstallazione: BeforeInstallPromptEvent | null = null;
const ascoltatori = new Set<() => void>();
const avvisa = () => ascoltatori.forEach((fn) => fn());

/**
 * Da chiamare una volta all'avvio (RegistraServiceWorker): il browser manda
 * `beforeinstallprompt` presto, anche prima che si apra la pagina account.
 */
let avviata = false;

export function avviaPwa() {
  if (typeof window === "undefined" || avviata) return;
  avviata = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptInstallazione = e as BeforeInstallPromptEvent;
    avvisa();
  });
  window.addEventListener("appinstalled", () => {
    promptInstallazione = null;
    avvisa();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker non registrato", err));
  }
}

export type StatoInstallazione = "installata" | "installabile" | "ios" | "non-disponibile";

function statoInstallazione(): StatoInstallazione {
  if (typeof window === "undefined") return "non-disponibile";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installata";
  if (promptInstallazione) return "installabile";
  // Safari su iPhone/iPad non ha il prompt: si installa da Condividi
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "non-disponibile";
}

export function useStatoInstallazione(): StatoInstallazione {
  return useSyncExternalStore(
    (fn) => {
      ascoltatori.add(fn);
      return () => ascoltatori.delete(fn);
    },
    statoInstallazione,
    () => "non-disponibile",
  );
}

export async function installaApp(): Promise<boolean> {
  if (!promptInstallazione) return false;
  await promptInstallazione.prompt();
  const { outcome } = await promptInstallazione.userChoice;
  promptInstallazione = null;
  avvisa();
  return outcome === "accepted";
}

/* ---------------- notifiche ---------------- */

export function notificheSupportate(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** La chiave VAPID arriva in base64url, PushManager la vuole in byte. */
function chiaveInByte(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function iscrizioneAttuale(): Promise<PushSubscription | null> {
  if (!notificheSupportate()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/**
 * Chiede il permesso, iscrive questo browser al push e registra
 * l'iscrizione nel backend. Lancia un Error con un messaggio già
 * pronto da mostrare.
 */
export async function attivaNotifiche(): Promise<void> {
  if (!notificheSupportate()) throw new Error("Questo browser non supporta le notifiche.");
  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") {
    throw new Error("Permesso negato: puoi riattivarlo dalle impostazioni del sito nel browser.");
  }
  const { chiave } = await getChiaveNotifiche();
  const reg = await navigator.serviceWorker.ready;
  let iscrizione: PushSubscription;
  try {
    iscrizione =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(chiave) }));
  } catch (err) {
    // il servizio push del browser (Google, Mozilla, Apple) non ha risposto
    console.error("Iscrizione push non riuscita", err);
    throw new Error("Il browser non è riuscito a registrarsi alle notifiche: riprova tra poco.");
  }
  await iscriviNotifiche(iscrizione.toJSON());
}

export async function disattivaNotifiche(): Promise<void> {
  const iscrizione = await iscrizioneAttuale();
  if (!iscrizione) return;
  await disiscriviNotifiche(iscrizione.endpoint).catch(() => undefined);
  await iscrizione.unsubscribe();
}
