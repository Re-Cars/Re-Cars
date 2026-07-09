import { apiFetch, getUtenteLoggato, Utente, Veicolo } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export async function logoutGlobale() {
  await AsyncStorage.multiRemove([
    "yd_utente_loggato",
    "yd_access_token",
    "veicoloAttivoId",
  ]);
  router.replace("/(auth)/login");
}

/**
 * Stato condiviso utente + garage: replica caricaVeicoli() /
 * selezionaVeicolo() / eliminaVeicolo() di functions-app.js del frontend web.
 */
export function useVeicoli() {
  const [utente, setUtente] = useState<Utente | null>(null);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [veicoloAttivo, setVeicoloAttivo] = useState<Veicolo | null>(null);
  const [caricamento, setCaricamento] = useState(true);

  const carica = useCallback(async () => {
    try {
      const u = await getUtenteLoggato();
      if (!u) {
        router.replace("/(auth)/login");
        return;
      }
      setUtente(u);

      const res = await apiFetch(`/veicolo/utente/${u.id}`);
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      const lista: Veicolo[] = data.map((v: any) => ({
        id: v.id,
        nome: `${v.marca ?? ""} ${v.modello ?? ""}`.trim(),
        targa: v.targa,
        tipo:
          v.dati_generici?.[0]?.tipo_veicolo === "Moto" ? "motorcycle" : "car",
      }));
      setVeicoli(lista);

      const idSalvato = await AsyncStorage.getItem("veicoloAttivoId");
      const trovato = idSalvato
        ? lista.find((v) => v.id === parseInt(idSalvato, 10))
        : undefined;
      setVeicoloAttivo(trovato ?? lista[0] ?? null);
    } catch (err) {
      console.error("Errore nel caricamento veicoli", err);
    } finally {
      setCaricamento(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica]),
  );

  async function seleziona(v: Veicolo) {
    setVeicoloAttivo(v);
    await AsyncStorage.setItem("veicoloAttivoId", String(v.id));
  }

  async function elimina(id: number): Promise<boolean> {
    try {
      const res = await apiFetch(`/veicolo/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        await logoutGlobale();
        return false;
      }
      if (!res.ok) return false;
      if (veicoloAttivo?.id === id) {
        await AsyncStorage.removeItem("veicoloAttivoId");
      }
      await carica();
      return true;
    } catch {
      return false;
    }
  }

  return {
    utente,
    veicoli,
    veicoloAttivo,
    caricamento,
    ricarica: carica,
    seleziona,
    elimina,
    logout: logoutGlobale,
  };
}
