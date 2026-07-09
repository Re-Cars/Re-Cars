import InputGroup from "@/components/auth/InputGroup";
import { API } from "@/constants/api";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "tipo" | "utente" | "business";
type BusinessTipo = null | "azienda" | "officina";

/** Bottone tipo account (replica .auth-tipo-btn del web). */
function TipoBtn({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-1 items-center gap-2 py-3.5 px-2 rounded-2xl"
      style={{
        borderWidth: 1,
        borderColor: selected ? "#f97316" : "rgba(255,255,255,0.15)",
        backgroundColor: selected
          ? "rgba(249,115,22,0.15)"
          : "rgba(255,255,255,0.06)",
      }}
    >
      <FontAwesome6 name={icon as any} size={18} color="#f97316" />
      <Text
        className={`text-xs font-semibold ${selected ? "text-white" : "text-white/75"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const [step, setStep] = useState<Step>("tipo");
  const [businessTipo, setBusinessTipo] = useState<BusinessTipo>(null);
  const [email, setEmail] = useState("");
  const [piva, setPiva] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkGiaLoggato() {
      const utente = await AsyncStorage.getItem("yd_utente_loggato");
      if (utente) {
        const u = JSON.parse(utente);
        if (u.partita_iva && !u.tipo) {
          router.replace("/(officina)/dashboard");
        } else {
          router.replace("/(utente)/home");
        }
      }
    }
    checkGiaLoggato();
  }, []);

  function tornaATipo() {
    setStep("tipo");
    setBusinessTipo(null);
    setErrore("");
    setPassword("");
  }

  async function login() {
    setErrore("");

    let url: string;
    let body: Record<string, string>;
    if (step === "utente") {
      url = `${API}/auth/login`;
      body = { email: email.trim(), password };
    } else {
      if (!businessTipo) {
        setErrore("Seleziona se sei Azienda o Officina");
        return;
      }
      url =
        businessTipo === "officina"
          ? `${API}/officina/login`
          : `${API}/auth/login/azienda`;
      body = { partita_iva: piva.trim(), password };
    }

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrore(
          Array.isArray(data.message)
            ? data.message[0]
            : (data.message ?? "Credenziali non valide"),
        );
        return;
      }

      const profilo =
        step === "business" && businessTipo === "officina"
          ? data.officina
          : data.utente;
      await AsyncStorage.setItem("yd_utente_loggato", JSON.stringify(profilo));
      await AsyncStorage.setItem("yd_access_token", data.access_token ?? "");

      if (step === "business" && businessTipo === "officina") {
        router.replace("/(officina)/dashboard");
      } else {
        router.replace("/(utente)/home");
      }
    } catch {
      setErrore("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          {/* card vetro come .auth-container */}
          <View
            className="mx-5 rounded-3xl p-7 gap-6"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            {/* logo */}
            <View className="items-center gap-1">
              <Text className="text-4xl font-extrabold text-orange tracking-widest">
                RE|CARS
              </Text>
              <Text className="text-xs italic text-white/60">
                Tu guida al resto pensiamo noi
              </Text>
            </View>

            {/* step 1: chi sei? */}
            {step === "tipo" && (
              <View className="gap-3.5">
                <Text className="text-xs font-medium text-white/60 uppercase tracking-widest text-center">
                  Accedi come...
                </Text>
                <View className="flex-row gap-2.5">
                  <TipoBtn
                    icon="user"
                    label="Utente"
                    onPress={() => setStep("utente")}
                  />
                  <TipoBtn
                    icon="building"
                    label="Business"
                    onPress={() => setStep("business")}
                  />
                </View>
              </View>
            )}

            {/* step 2a: login utente */}
            {step === "utente" && (
              <View className="gap-3.5">
                <TouchableOpacity
                  onPress={tornaATipo}
                  className="flex-row items-center gap-1.5"
                >
                  <FontAwesome6
                    name="arrow-left"
                    size={11}
                    color="rgba(255,255,255,0.5)"
                  />
                  <Text className="text-xs text-white/50">Indietro</Text>
                </TouchableOpacity>
                <InputGroup
                  icon="envelope"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <InputGroup
                  icon="lock"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            )}

            {/* step 2b: login business */}
            {step === "business" && (
              <View className="gap-3.5">
                <TouchableOpacity
                  onPress={tornaATipo}
                  className="flex-row items-center gap-1.5"
                >
                  <FontAwesome6
                    name="arrow-left"
                    size={11}
                    color="rgba(255,255,255,0.5)"
                  />
                  <Text className="text-xs text-white/50">Indietro</Text>
                </TouchableOpacity>
                <View className="flex-row gap-2.5">
                  <TipoBtn
                    icon="briefcase"
                    label="Azienda"
                    selected={businessTipo === "azienda"}
                    onPress={() => setBusinessTipo("azienda")}
                  />
                  <TipoBtn
                    icon="screwdriver-wrench"
                    label="Officina"
                    selected={businessTipo === "officina"}
                    onPress={() => setBusinessTipo("officina")}
                  />
                </View>
                <InputGroup
                  icon="file-invoice"
                  placeholder="Partita IVA"
                  value={piva}
                  onChangeText={setPiva}
                  autoCapitalize="none"
                />
                <InputGroup
                  icon="lock"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            )}

            {errore !== "" && (
              <Text className="text-xs text-center" style={{ color: "#ff6b6b" }}>
                {errore}
              </Text>
            )}

            {/* bottone ACCEDI (btn-landing) */}
            {step !== "tipo" && (
              <TouchableOpacity
                onPress={login}
                disabled={loading}
                activeOpacity={0.8}
                className="self-center flex-row items-center gap-2 rounded-full px-8 py-3"
                style={{ backgroundColor: "#f97316" }}
              >
                <FontAwesome6
                  name="right-to-bracket"
                  size={13}
                  color="#ffffff"
                />
                <Text className="text-sm font-bold text-white tracking-wider">
                  {loading ? "ACCESSO..." : "ACCEDI"}
                </Text>
              </TouchableOpacity>
            )}

            {/* switch registrazione */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              className="items-center"
            >
              <Text className="text-sm text-white/60">
                Non hai un account?{" "}
                <Text className="text-orange font-semibold">Registrati</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
