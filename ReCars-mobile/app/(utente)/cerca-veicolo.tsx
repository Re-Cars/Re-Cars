import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch } from "@/constants/api";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TARGA_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
const STORICO_KEY = "storico_targhe";

type Risultato = {
  targa: string;
  marca: string;
  modello: string;
  alimentazione?: string;
  cavalli?: number;
  isbolloattivo?: boolean;
  isinsured?: boolean;
};

function LoadingDots() {
  const anims = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(a, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(a, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View className="items-center py-4">
      <View className="flex-row gap-1.5 mb-2">
        {anims.map((a, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#f97316",
              opacity: a.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
              transform: [
                {
                  scale: a.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            }}
          />
        ))}
      </View>
      <Text className="text-xs text-white/40">Ricerca in corso...</Text>
    </View>
  );
}

function CampoRisultato({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-[9px] font-bold uppercase tracking-wider text-white/30">
        {label}
      </Text>
      <Text className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
        {value}
      </Text>
    </View>
  );
}

function StatoRisultato({ label, ok }: { label: string; ok: boolean }) {
  const colore = ok ? "#4ade80" : "#f87171";
  const testo =
    label === "Bollo" ? (ok ? "Attivo" : "Scaduto") : ok ? "Attiva" : "Scaduta";
  return (
    <View className="flex-1 gap-1">
      <Text className="text-[9px] font-bold uppercase tracking-wider text-white/30">
        {label}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colore,
          }}
        />
        <Text className="text-xs font-semibold" style={{ color: colore }}>
          {testo}
        </Text>
      </View>
    </View>
  );
}

export default function CercaVeicoloScreen() {
  const { utente, veicoli, veicoloAttivo, seleziona, elimina, ricarica } =
    useVeicoli();

  const [targa, setTarga] = useState("");
  const [loading, setLoading] = useState(false);
  const [risultato, setRisultato] = useState<Risultato | null>(null);
  const [messaggio, setMessaggio] = useState("");
  const [storico, setStorico] = useState<string[]>([]);
  const [aggiunto, setAggiunto] = useState(false);

  const targaValida = TARGA_REGEX.test(targa);
  const targaCompleta = targa.length === 7;

  useEffect(() => {
    AsyncStorage.getItem(STORICO_KEY).then((s) => {
      if (s) setStorico(JSON.parse(s));
    });
  }, []);

  async function salvaStorico(t: string) {
    const nuovo = [t, ...storico.filter((x) => x !== t)].slice(0, 5);
    setStorico(nuovo);
    await AsyncStorage.setItem(STORICO_KEY, JSON.stringify(nuovo));
  }

  async function rimuoviStorico(t: string) {
    const nuovo = storico.filter((x) => x !== t);
    setStorico(nuovo);
    await AsyncStorage.setItem(STORICO_KEY, JSON.stringify(nuovo));
  }

  async function cerca(plate?: string) {
    const p = (plate ?? targa).toUpperCase();
    if (!TARGA_REGEX.test(p)) {
      setMessaggio("Inserisci una targa valida (es. AA123BB)");
      return;
    }
    setMessaggio("");
    setRisultato(null);
    setAggiunto(false);
    setLoading(true);
    try {
      const res = await apiFetch(`/veicolo/cerca/${p}`);
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessaggio(
          Array.isArray(data.message)
            ? data.message[0]
            : (data.message ?? "Veicolo non trovato."),
        );
        return;
      }
      await salvaStorico(p);
      setRisultato(data);
    } catch {
      setMessaggio("Errore di connessione al server.");
    } finally {
      setLoading(false);
    }
  }

  async function aggiungiAlGarage() {
    if (!risultato || !utente) return;
    setMessaggio("");
    try {
      const res = await apiFetch("/veicolo", {
        method: "POST",
        body: JSON.stringify({ targa: risultato.targa, id_utente: utente.id }),
      });
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (res.status === 409) {
        setMessaggio("Veicolo già esistente nel garage!");
        return;
      }
      if (res.status === 403) {
        setMessaggio(
          "Hai raggiunto il limite di veicoli del tuo piano. Passa a un piano superiore per aggiungerne altri.",
        );
        return;
      }
      if (!res.ok) {
        setMessaggio("Errore durante l'aggiunta del veicolo.");
        return;
      }
      setAggiunto(true);
      await ricarica();
      setTimeout(() => router.replace("/(utente)/home"), 900);
    } catch {
      setMessaggio("Errore di connessione.");
    }
  }

  return (
    <SectionScreen
      titolo="Cerca e Aggiungi Veicolo"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* cerca-hero */}
      <View
        className="rounded-3xl p-6"
        style={{
          backgroundColor: "#141445",
          borderWidth: 0.5,
          borderColor: "rgba(249,115,22,0.3)",
        }}
      >
        <View className="flex-row items-center justify-center gap-2.5 mb-2">
          <FontAwesome6 name="magnifying-glass" size={16} color="#f97316" />
          <Text className="text-lg font-extrabold text-white">
            Cerca il tuo veicolo
          </Text>
        </View>
        <Text className="text-xs text-white/45 text-center leading-4 mb-5">
          Inserisci la targa per visualizzare i dati e aggiungere il veicolo al
          tuo garage
        </Text>

        {/* feature tiles */}
        <View className="flex-row gap-3 mb-5">
          {(
            [
              ["car", "rgba(43,136,184,0.2)", "#60b8e0", "Marca e modello"],
              [
                "gas-pump",
                "rgba(249,115,22,0.2)",
                "#f97316",
                "Alimentazione e cavalli",
              ],
              [
                "calendar-check",
                "rgba(34,197,94,0.15)",
                "#4ade80",
                "Bollo e assicurazione",
              ],
            ] as const
          ).map(([icon, bg, color, label]) => (
            <View
              key={icon}
              className="flex-1 items-center gap-1.5 rounded-xl py-3 px-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: bg }}
              >
                <FontAwesome6 name={icon as any} size={14} color={color} />
              </View>
              <Text className="text-[10px] text-white/50 text-center leading-3">
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* input targa + bottone */}
        <View className="flex-row gap-2">
          <View className="flex-1 relative justify-center">
            <View style={{ position: "absolute", left: 13, zIndex: 1 }}>
              <FontAwesome6 name="car" size={13} color="#f97316" />
            </View>
            <TextInput
              value={targa}
              onChangeText={(t) => setTarga(t.toUpperCase())}
              maxLength={7}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Es. AA123BB"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="text-white text-sm font-semibold rounded-xl"
              style={{
                paddingLeft: 38,
                paddingRight: 34,
                paddingVertical: 12,
                letterSpacing: 3,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1.5,
                borderColor: !targaCompleta
                  ? "rgba(255,255,255,0.12)"
                  : targaValida
                    ? "#4ade80"
                    : "#f87171",
              }}
            />
            {targaCompleta && (
              <View style={{ position: "absolute", right: 12 }}>
                <FontAwesome6
                  name={targaValida ? "circle-check" : "circle-xmark"}
                  size={14}
                  color={targaValida ? "#4ade80" : "#f87171"}
                />
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => cerca()}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-full px-4"
            style={{
              backgroundColor: "rgba(249,115,22,0.18)",
              borderWidth: 1,
              borderColor: "#f97316",
            }}
          >
            <View className="w-5 h-5 rounded-full bg-orange items-center justify-center">
              <FontAwesome6 name="magnifying-glass" size={9} color="#fff" />
            </View>
            <Text className="text-xs font-bold text-orange">Cerca</Text>
          </TouchableOpacity>
        </View>

        {loading && <LoadingDots />}

        {messaggio !== "" && (
          <Text
            className="text-xs text-center mt-3"
            style={{ color: "#f87171" }}
          >
            {messaggio}
          </Text>
        )}

        {/* risultato */}
        {risultato && (
          <View
            className="rounded-2xl mt-4 overflow-hidden"
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View className="bg-orange rounded-md px-3 py-1">
                <Text
                  className="text-sm font-extrabold text-white"
                  style={{ letterSpacing: 3 }}
                >
                  {risultato.targa}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-white/60">
                {risultato.marca} {risultato.modello}
              </Text>
            </View>
            <View
              style={{
                height: 0.5,
                backgroundColor: "rgba(255,255,255,0.08)",
                marginHorizontal: 16,
              }}
            />
            <View className="px-4 py-3.5 gap-3">
              <View className="flex-row gap-3">
                <CampoRisultato
                  label="Alimentazione"
                  value={risultato.alimentazione || "-"}
                />
                <CampoRisultato
                  label="Cavalli"
                  value={risultato.cavalli ? `${risultato.cavalli} CV` : "-"}
                />
              </View>
              <View className="flex-row gap-3">
                <StatoRisultato label="Bollo" ok={!!risultato.isbolloattivo} />
                <StatoRisultato
                  label="Assicurazione"
                  ok={!!risultato.isinsured}
                />
              </View>
            </View>
            <View className="items-center pb-4 px-4">
              <TouchableOpacity
                onPress={aggiungiAlGarage}
                disabled={aggiunto}
                activeOpacity={0.8}
                className="flex-row items-center gap-2 rounded-full px-7 py-2.5"
                style={{
                  backgroundColor: aggiunto
                    ? "rgba(74,222,128,0.18)"
                    : "rgba(249,115,22,0.18)",
                  borderWidth: 1,
                  borderColor: aggiunto ? "#4ade80" : "#f97316",
                }}
              >
                <View
                  className="w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: aggiunto ? "#4ade80" : "#f97316" }}
                >
                  <FontAwesome6
                    name={aggiunto ? "check" : "warehouse"}
                    size={9}
                    color="#fff"
                  />
                </View>
                <Text
                  className="text-xs font-bold"
                  style={{ color: aggiunto ? "#4ade80" : "#f97316" }}
                >
                  {aggiunto ? "Aggiunto al garage!" : "Aggiungi al garage"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* storico ricerche */}
        {storico.length > 0 && (
          <View
            className="mt-4 pt-3.5"
            style={{
              borderTopWidth: 0.5,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text className="text-[10px] uppercase tracking-wider text-white/35 mb-2">
              Cercate di recente
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {storico.map((t) => (
                <View
                  key={t}
                  className="flex-row items-center gap-1.5 rounded-md px-2.5 py-1"
                  style={{
                    backgroundColor: "rgba(249,115,22,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(249,115,22,0.3)",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setTarga(t);
                      cerca(t);
                    }}
                  >
                    <Text
                      className="text-xs font-bold text-orange"
                      style={{ letterSpacing: 1 }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => rimuoviStorico(t)}
                    hitSlop={6}
                  >
                    <FontAwesome6
                      name="xmark"
                      size={9}
                      color="rgba(255,255,255,0.4)"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </SectionScreen>
  );
}
