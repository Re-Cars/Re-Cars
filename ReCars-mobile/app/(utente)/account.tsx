import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch } from "@/constants/api";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Campo = "username" | "email" | "cellulare" | "password";

type DatiAccount = {
  username?: string;
  email?: string;
  cellulare?: string;
  created_at?: string;
};

const CONFIG_CAMPI: Record<
  Campo,
  { icon: string; title: string; placeholder: string; secure?: boolean }
> = {
  username: {
    icon: "user",
    title: "Cambia username",
    placeholder: "Nuovo username",
  },
  email: { icon: "envelope", title: "Cambia email", placeholder: "Nuova email" },
  cellulare: {
    icon: "phone",
    title: "Numero di telefono",
    placeholder: "Es. 3331234567",
  },
  password: {
    icon: "key",
    title: "Cambia password",
    placeholder: "Nuova password",
    secure: true,
  },
};

function SectionBar({
  icon,
  label,
  danger,
}: {
  icon: string;
  label: string;
  danger?: boolean;
}) {
  const colore = danger ? "#ff6b6b" : "#f97316";
  return (
    <View
      className="flex-row items-center gap-2.5 px-4 py-3"
      style={{
        borderBottomWidth: 0.5,
        borderColor: danger ? "rgba(255,107,107,0.25)" : "rgba(249,115,22,0.2)",
      }}
    >
      <FontAwesome6 name={icon as any} size={13} color={colore} />
      <Text
        className="text-sm font-bold"
        style={{ color: danger ? "#ff6b6b" : "#ffffff" }}
      >
        {label}
      </Text>
    </View>
  );
}

function BtnPill({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colore = danger ? "#ff6b6b" : "#f97316";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center gap-2 rounded-full px-3.5 py-1.5"
      style={{
        backgroundColor: danger
          ? "rgba(255,107,107,0.12)"
          : "rgba(249,115,22,0.15)",
        borderWidth: 1,
        borderColor: danger ? "rgba(255,107,107,0.5)" : "rgba(249,115,22,0.5)",
      }}
    >
      <View
        className="w-4.5 h-4.5 rounded-full items-center justify-center"
        style={{ width: 18, height: 18, backgroundColor: colore }}
      >
        <FontAwesome6 name={icon as any} size={8} color="#fff" />
      </View>
      <Text className="text-xs font-bold" style={{ color: colore }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const { utente, veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [dati, setDati] = useState<DatiAccount>({});
  const [campoAperto, setCampoAperto] = useState<Campo | null>(null);
  const [valore, setValore] = useState("");
  const [erroreCampo, setErroreCampo] = useState("");
  const [confermaElimina, setConfermaElimina] = useState(false);

  useEffect(() => {
    if (!utente) return;
    let annullato = false;
    async function carica() {
      try {
        const res = await apiFetch(`/auth/utente/${utente!.id}`);
        if (res.status === 401) {
          await logoutGlobale();
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!annullato) setDati(data);
      } catch (err) {
        console.error("Errore caricamento account", err);
      }
    }
    carica();
    return () => {
      annullato = true;
    };
  }, [utente]);

  function apriModifica(campo: Campo) {
    setCampoAperto(campo);
    setValore(campo === "password" ? "" : ((dati as any)[campo] ?? ""));
    setErroreCampo("");
  }

  async function salvaCampo() {
    if (!campoAperto || !utente) return;
    const v = valore.trim();
    if (!v) {
      setErroreCampo("Il campo non può essere vuoto");
      return;
    }
    try {
      const res = await apiFetch(`/auth/utente/${utente.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [campoAperto]: v }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroreCampo(
          Array.isArray(data.message)
            ? data.message[0]
            : (data.message ?? "Errore durante il salvataggio"),
        );
        return;
      }
      if (campoAperto === "username") {
        await AsyncStorage.setItem(
          "yd_utente_loggato",
          JSON.stringify({ ...utente, username: v }),
        );
      }
      setDati((prev) => ({
        ...prev,
        ...(campoAperto !== "password" ? { [campoAperto]: v } : {}),
      }));
      setCampoAperto(null);
    } catch {
      setErroreCampo("Errore di connessione al server");
    }
  }

  async function eliminaAccount() {
    setConfermaElimina(false);
    if (!utente) return;
    try {
      const res = await apiFetch(`/auth/utente/${utente.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await AsyncStorage.clear();
      await logoutGlobale();
    } catch {
      // errore di connessione: resta sulla pagina
    }
  }

  const membroDa = dati.created_at
    ? `Membro dal ${new Date(dati.created_at).toLocaleDateString("it-IT")}`
    : "Membro RE|CARS";

  return (
    <SectionScreen
      titolo="Il mio account"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      <View className="gap-4">
        {/* profilo */}
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#141445",
            borderWidth: 0.5,
            borderColor: "rgba(249,115,22,0.25)",
          }}
        >
          <SectionBar icon="user" label="Profilo" />
          <View className="flex-row items-center gap-4 p-4">
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 60,
                height: 60,
                backgroundColor: "#f97316",
              }}
            >
              <Text className="text-xl font-extrabold text-white">
                {(dati.username ?? utente?.username ?? "U")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-base font-bold text-white">
                {dati.username ?? utente?.username ?? "-"}
              </Text>
              <Text className="text-xs text-white/45 mt-0.5">{membroDa}</Text>
            </View>
          </View>
        </View>

        {/* dati account */}
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#141445",
            borderWidth: 0.5,
            borderColor: "rgba(249,115,22,0.25)",
          }}
        >
          <SectionBar icon="id-card" label="Dati account" />
          <View className="p-4 gap-4">
            {(
              [
                ["Username", dati.username ?? "-", "username", "pen", "Modifica"],
                ["Email", dati.email ?? "-", "email", "pen", "Modifica"],
                [
                  "Telefono",
                  dati.cellulare || "Non impostato",
                  "cellulare",
                  dati.cellulare ? "pen" : "plus",
                  dati.cellulare ? "Modifica" : "Aggiungi",
                ],
                ["Password", "••••••••", "password", "key", "Cambia"],
              ] as const
            ).map(([label, val, campo, icon, btnLabel]) => (
              <View
                key={campo}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-[10px] uppercase tracking-wider text-white/35">
                    {label}
                  </Text>
                  <Text
                    className="text-sm text-white mt-0.5"
                    numberOfLines={1}
                  >
                    {val}
                  </Text>
                </View>
                <BtnPill
                  icon={icon}
                  label={btnLabel}
                  onPress={() => apriModifica(campo as Campo)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* abbonamento */}
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#141445",
            borderWidth: 0.5,
            borderColor: "rgba(249,115,22,0.25)",
          }}
        >
          <SectionBar icon="credit-card" label="Abbonamento" />
          <View className="p-4 gap-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] uppercase tracking-wider text-white/35">
                  Piano attivo
                </Text>
                <Text className="text-sm font-bold text-white mt-0.5">
                  Piano Base
                </Text>
                <Text className="text-xs text-white/45">
                  1 veicolo incluso
                </Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ backgroundColor: "rgba(74,222,128,0.12)" }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#4ade80",
                  }}
                />
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: "#4ade80" }}
                >
                  Attivo
                </Text>
              </View>
            </View>
            <BtnPill
              icon="arrow-right"
              label="Gestisci abbonamento"
              onPress={() => router.push("/(utente)/abbonamenti")}
            />
          </View>
        </View>

        {/* zona pericolosa */}
        <View
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#141445",
            borderWidth: 0.5,
            borderColor: "rgba(255,107,107,0.3)",
          }}
        >
          <SectionBar icon="triangle-exclamation" label="Zona pericolosa" danger />
          <View className="p-4 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                Elimina account
              </Text>
              <Text className="text-xs text-white/40 leading-4 mt-0.5">
                Questa azione è irreversibile. Tutti i tuoi dati verranno
                eliminati permanentemente.
              </Text>
            </View>
            <BtnPill
              icon="trash"
              label="Elimina"
              danger
              onPress={() => setConfermaElimina(true)}
            />
          </View>
        </View>
      </View>

      {/* modal modifica campo */}
      <Modal
        visible={campoAperto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCampoAperto(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            className="rounded-2xl p-5 w-full gap-3"
            style={{
              maxWidth: 340,
              backgroundColor: "#141445",
              borderWidth: 0.5,
              borderColor: "rgba(249,115,22,0.3)",
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome6
                name={(campoAperto ? CONFIG_CAMPI[campoAperto].icon : "pen") as any}
                size={13}
                color="#f97316"
              />
              <Text className="text-base font-bold text-white">
                {campoAperto ? CONFIG_CAMPI[campoAperto].title : ""}
              </Text>
            </View>
            <TextInput
              value={valore}
              onChangeText={setValore}
              placeholder={
                campoAperto ? CONFIG_CAMPI[campoAperto].placeholder : ""
              }
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={campoAperto === "password"}
              autoCapitalize="none"
              autoFocus
              className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-sm"
            />
            {erroreCampo !== "" && (
              <Text className="text-xs" style={{ color: "#ff6b6b" }}>
                {erroreCampo}
              </Text>
            )}
            <View className="flex-row gap-2.5 mt-1">
              <TouchableOpacity
                onPress={() => setCampoAperto(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 items-center"
              >
                <Text className="text-sm font-semibold text-muted">
                  Annulla
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={salvaCampo}
                className="flex-1 py-2.5 rounded-xl bg-orange items-center"
              >
                <Text className="text-sm font-bold text-white">Salva</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* conferma elimina account */}
      <Modal
        visible={confermaElimina}
        transparent
        animationType="fade"
        onRequestClose={() => setConfermaElimina(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            className="rounded-2xl p-6 items-center gap-2.5 w-full"
            style={{
              maxWidth: 320,
              backgroundColor: "#141445",
              borderWidth: 1,
              borderColor: "rgba(255,107,107,0.2)",
            }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 52,
                height: 52,
                backgroundColor: "rgba(255,107,107,0.1)",
                borderWidth: 1.5,
                borderColor: "rgba(255,107,107,0.3)",
              }}
            >
              <FontAwesome6
                name="triangle-exclamation"
                size={18}
                color="#ff6b6b"
              />
            </View>
            <Text className="text-base font-bold text-white">
              Elimina account
            </Text>
            <Text className="text-sm text-muted text-center leading-5">
              Questa azione è irreversibile. Vuoi davvero eliminare il tuo
              account?
            </Text>
            <View className="flex-row gap-2.5 w-full mt-2">
              <TouchableOpacity
                onPress={() => setConfermaElimina(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 items-center"
              >
                <Text className="text-sm font-semibold text-muted">
                  Annulla
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={eliminaAccount}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={{ backgroundColor: "#ff6b6b" }}
              >
                <Text className="text-sm font-bold text-white">Elimina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SectionScreen>
  );
}
