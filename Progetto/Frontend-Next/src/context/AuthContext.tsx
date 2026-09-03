"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, eliminaVeicolo as apiEliminaVeicolo, getVeicoliUtente } from "@/lib/api";
import { logout as authLogout, salvaSessione } from "@/lib/auth";
import {
  getUtenteLoggato,
  getVeicoloAttivoId,
  removeVeicoloAttivo,
  setVeicoloAttivo as persistiVeicoloAttivo,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { UtenteLoggato, VeicoloCompatto, VeicoloDettaglio } from "@/lib/types";

/** Effetto one-shot sul bottone del garage (pop dopo aggiunta, shake dopo eliminazione). */
export type GarageEffetto = "pop" | "delete" | null;

interface AuthContextValue {
  /** Profilo salvato al login; null finché non idratato o se non loggati. */
  utente: UtenteLoggato | null;
  /** True dopo la lettura iniziale da localStorage (evita flash SSR). */
  pronto: boolean;
  veicoli: VeicoloCompatto[];
  veicoloAttivo: VeicoloCompatto | null;
  garageEffetto: GarageEffetto;
  aggiornaUtente: (utente: UtenteLoggato) => void;
  caricaVeicoli: () => Promise<void>;
  selezionaVeicolo: (id: number) => void;
  eliminaVeicoloDalGarage: (id: number) => Promise<boolean>;
  consumaGarageEffetto: () => void;
  segnalaGarageEffetto: (effetto: Exclude<GarageEffetto, null>) => void;
  logout: () => Promise<void>;
  /** Gestione centralizzata del 401 (sessione JWT scaduta). */
  gestisci401: (err: unknown) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mappaVeicolo(v: VeicoloDettaglio): VeicoloCompatto {
  return {
    id: v.id,
    nome: `${v.marca ?? ""} ${v.modello ?? ""}`.trim(),
    targa: v.targa,
    tipo: v.dati_generici[0]?.tipo_veicolo === "Moto" ? "motorcycle" : "car",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [utente, setUtente] = useState<UtenteLoggato | null>(null);
  const [pronto, setPronto] = useState(false);
  const [veicoli, setVeicoli] = useState<VeicoloCompatto[]>([]);
  const [veicoloAttivoId, setVeicoloAttivoId] = useState<number | null>(null);
  const [garageEffetto, setGarageEffetto] = useState<GarageEffetto>(null);

  const veicoloAttivo = useMemo(
    () => veicoli.find((v) => v.id === veicoloAttivoId) ?? veicoli[0] ?? null,
    [veicoli, veicoloAttivoId],
  );

  const logout = useCallback(async () => {
    await authLogout();
    setUtente(null);
    setVeicoli([]);
    setVeicoloAttivoId(null);
    router.push("/");
  }, [router]);

  const gestisci401 = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        alert("Sessione scaduta, effettua di nuovo il login");
        void logout();
        return true;
      }
      return false;
    },
    [logout],
  );

  const caricaVeicoli = useCallback(async () => {
    const salvato = getUtenteLoggato();
    if (!salvato) return;
    try {
      const data = await getVeicoliUtente(salvato.id);
      const mappati = data.map(mappaVeicolo);
      setVeicoli(mappati);

      const idSalvato = getVeicoloAttivoId();
      const attivo = mappati.find((v) => v.id === idSalvato) ?? mappati[0] ?? null;
      setVeicoloAttivoId(attivo?.id ?? null);
      if (attivo) persistiVeicoloAttivo(attivo);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }
      console.error("Errore nel caricamento veicoli", err);
    }
  }, [logout]);

  const selezionaVeicolo = useCallback(
    (id: number) => {
      const veicolo = veicoli.find((v) => v.id === id);
      if (!veicolo) return;
      setVeicoloAttivoId(id);
      persistiVeicoloAttivo(veicolo);
    },
    [veicoli],
  );

  const eliminaVeicoloDalGarage = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await apiEliminaVeicolo(id);
      } catch (err) {
        if (gestisci401(err)) return false;
        alert("Errore durante l'eliminazione del veicolo.");
        return false;
      }
      if (getVeicoloAttivoId() === id) removeVeicoloAttivo();
      await caricaVeicoli();
      setGarageEffetto("delete");
      return true;
    },
    [caricaVeicoli, gestisci401],
  );

  const aggiornaUtente = useCallback((nuovo: UtenteLoggato) => {
    salvaSessione(nuovo);
    setUtente(nuovo);
  }, []);

  const consumaGarageEffetto = useCallback(() => setGarageEffetto(null), []);
  const segnalaGarageEffetto = useCallback(
    (effetto: Exclude<GarageEffetto, null>) => setGarageEffetto(effetto),
    [],
  );

  // idratazione iniziale da localStorage + primo caricamento veicoli
  useEffect(() => {
    const salvato = getUtenteLoggato();
    setUtente(salvato);
    setPronto(true);
    if (salvato) void caricaVeicoli();
  }, [caricaVeicoli]);

  // sync tra tab (il vanilla ascoltava l'evento `storage` per il veicolo attivo)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.veicoloAttivoId) {
        const id = e.newValue ? Number.parseInt(e.newValue, 10) : null;
        setVeicoloAttivoId(Number.isNaN(id as number) ? null : id);
      }
      if (e.key === STORAGE_KEYS.utenteLoggato) {
        setUtente(getUtenteLoggato());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      utente,
      pronto,
      veicoli,
      veicoloAttivo,
      garageEffetto,
      aggiornaUtente,
      caricaVeicoli,
      selezionaVeicolo,
      eliminaVeicoloDalGarage,
      consumaGarageEffetto,
      segnalaGarageEffetto,
      logout,
      gestisci401,
    }),
    [
      utente,
      pronto,
      veicoli,
      veicoloAttivo,
      garageEffetto,
      aggiornaUtente,
      caricaVeicoli,
      selezionaVeicolo,
      eliminaVeicoloDalGarage,
      consumaGarageEffetto,
      segnalaGarageEffetto,
      logout,
      gestisci401,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro <AuthProvider>");
  return ctx;
}
