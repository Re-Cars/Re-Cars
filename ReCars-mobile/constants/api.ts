import AsyncStorage from "@react-native-async-storage/async-storage";

export const API = "https://mug-unbalance-random.ngrok-free.dev";

export type Utente = {
  id: number;
  username?: string;
  email?: string;
  tipo?: string;
  avatar?: string;
  partita_iva?: string;
  ragione_sociale?: string;
};

export type Veicolo = {
  id: number;
  nome: string;
  targa: string;
  tipo: "car" | "motorcycle";
};

export async function getUtenteLoggato(): Promise<Utente | null> {
  const str = await AsyncStorage.getItem("yd_utente_loggato");
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem("yd_access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await authHeaders();
  return fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as any) },
  });
}
