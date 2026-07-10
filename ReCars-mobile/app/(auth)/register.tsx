import InputGroup from "@/components/auth/InputGroup";
import TouchFeedback from "@/components/TouchFeedback";
import { API } from "@/constants/api";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tipo = null | "privato" | "azienda" | "officina";
type Citta = { sigla: string; nome: string };

function TipoBtn({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-1 items-center gap-2 py-3.5 px-2 rounded-2xl"
      style={{
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <FontAwesome6 name={icon as any} size={18} color="#f97316" />
      <Text className="text-xs font-semibold text-white/75">{label}</Text>
    </TouchableOpacity>
  );
}

export default function RegisterScreen() {
  const [tipo, setTipo] = useState<Tipo>(null);
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(false);

  // campi comuni / privato / azienda
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [piva, setPiva] = useState("");
  const [sdi, setSdi] = useState("");

  // campi officina
  const [nomeOfficina, setNomeOfficina] = useState("");
  const [telefono, setTelefono] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cittaQuery, setCittaQuery] = useState("");
  const [cittaSigla, setCittaSigla] = useState("");
  const [cittaRisultati, setCittaRisultati] = useState<Citta[]>([]);

  function tornaATipo() {
    setTipo(null);
    setErrore("");
  }

  async function cercaCitta(query: string) {
    setCittaQuery(query);
    setCittaSigla("");
    if (query.length < 2) {
      setCittaRisultati([]);
      return;
    }
    try {
      const res = await fetch(`${API}/citta?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setCittaRisultati(Array.isArray(data) ? data.slice(0, 6) : []);
    } catch {
      setCittaRisultati([]);
    }
  }

  async function register() {
    setErrore("");
    if (!tipo) return;

    let url: string;
    let body: Record<string, unknown>;

    if (tipo === "privato") {
      url = `${API}/auth/register`;
      body = {
        username: username.trim(),
        email: email.trim(),
        password,
        tipo: "privato",
      };
    } else if (tipo === "azienda") {
      url = `${API}/auth/register`;
      body = {
        username: username.trim(),
        email: email.trim(),
        password,
        tipo: "azienda",
        ragione_sociale: ragioneSociale.trim(),
        partita_iva: piva.trim(),
        codice_sdi: sdi.trim() || null,
      };
    } else {
      url = `${API}/officina/register`;
      body = {
        email: email.trim(),
        password,
        nome: nomeOfficina.trim(),
        ragione_sociale: ragioneSociale.trim(),
        partita_iva: piva.trim(),
        codice_sdi: sdi.trim() || null,
        telefono: telefono.trim(),
        indirizzo: indirizzo.trim(),
        sigla_citta: cittaSigla,
      };
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
            : (data.message ?? "Errore durante la registrazione"),
        );
        return;
      }

      // auto-login dopo registrazione
      const profilo = tipo === "officina" ? data.officina : data.utente;
      await AsyncStorage.setItem("yd_utente_loggato", JSON.stringify(profilo));
      if (data.access_token) {
        await AsyncStorage.setItem("yd_access_token", data.access_token);
      }

      if (tipo === "officina") {
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            className="mx-5 rounded-3xl p-7 gap-6"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <View className="items-center gap-1">
              <Text className="text-4xl font-extrabold text-orange tracking-widest">
                RE|CARS
              </Text>
              <Text className="text-xs italic text-white/60">
                Tu guida al resto pensiamo noi
              </Text>
            </View>

            {/* step 1: chi sei? */}
            {!tipo && (
              <View className="gap-3.5">
                <Text className="text-xs font-medium text-white/60 uppercase tracking-widest text-center">
                  Registrati come...
                </Text>
                <View className="flex-row gap-2.5">
                  <TipoBtn
                    icon="user"
                    label="Privato"
                    onPress={() => setTipo("privato")}
                  />
                  <TipoBtn
                    icon="briefcase"
                    label="Azienda"
                    onPress={() => setTipo("azienda")}
                  />
                  <TipoBtn
                    icon="screwdriver-wrench"
                    label="Officina"
                    onPress={() => setTipo("officina")}
                  />
                </View>
              </View>
            )}

            {/* step 2: form */}
            {tipo && (
              <View className="gap-3.5">
                {/* .auth-back-step: freccia e testo che si accendono
                    d'arancio alla pressione (hover del web, color 0.2s) */}
                <TouchFeedback
                  onPress={tornaATipo}
                  scaleTo={0.97}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  {({ pressed }) => (
                    <>
                      <FontAwesome6
                        name="arrow-left"
                        size={12}
                        color={pressed ? "#f97316" : "rgba(255,255,255,0.5)"}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: pressed
                            ? "#f97316"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        Indietro
                      </Text>
                    </>
                  )}
                </TouchFeedback>

                {tipo !== "officina" && (
                  <InputGroup
                    icon="user"
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                )}
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

                {tipo === "officina" && (
                  <InputGroup
                    icon="store"
                    placeholder="Nome Officina"
                    value={nomeOfficina}
                    onChangeText={setNomeOfficina}
                  />
                )}

                {tipo !== "privato" && (
                  <>
                    <InputGroup
                      icon="building"
                      placeholder="Ragione Sociale"
                      value={ragioneSociale}
                      onChangeText={setRagioneSociale}
                    />
                    <InputGroup
                      icon="file-invoice"
                      placeholder="Partita IVA"
                      value={piva}
                      onChangeText={setPiva}
                      autoCapitalize="none"
                    />
                    <InputGroup
                      icon="file-invoice"
                      placeholder="Codice SDI (opzionale)"
                      value={sdi}
                      onChangeText={setSdi}
                      autoCapitalize="characters"
                    />
                  </>
                )}

                {tipo === "officina" && (
                  <>
                    <InputGroup
                      icon="phone"
                      placeholder="Telefono"
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                    />
                    <InputGroup
                      icon="location-dot"
                      placeholder="Indirizzo"
                      value={indirizzo}
                      onChangeText={setIndirizzo}
                    />
                    <View>
                      <InputGroup
                        icon="city"
                        placeholder="Città (es. Milano)"
                        value={cittaQuery}
                        onChangeText={cercaCitta}
                        autoCorrect={false}
                      />
                      {cittaRisultati.length > 0 && (
                        <View
                          className="rounded-xl mt-1 overflow-hidden"
                          style={{
                            backgroundColor: "rgba(20,20,60,0.97)",
                            borderWidth: 1,
                            borderColor: "rgba(249,115,22,0.3)",
                          }}
                        >
                          {cittaRisultati.map((c) => (
                            <TouchableOpacity
                              key={c.sigla + c.nome}
                              onPress={() => {
                                setCittaQuery(c.nome);
                                setCittaSigla(c.sigla);
                                setCittaRisultati([]);
                              }}
                              className="flex-row gap-2 px-3.5 py-2.5"
                            >
                              <Text className="text-xs font-semibold text-orange">
                                {c.sigla}
                              </Text>
                              <Text className="text-xs text-white/80">
                                {c.nome}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </>
                )}

                {errore !== "" && (
                  <Text
                    className="text-xs text-center"
                    style={{ color: "#ff6b6b" }}
                  >
                    {errore}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={register}
                  disabled={loading}
                  activeOpacity={0.8}
                  className="self-center flex-row items-center gap-2 rounded-full px-8 py-3 mt-1"
                  style={{ backgroundColor: "#f97316" }}
                >
                  <FontAwesome6 name="user-plus" size={13} color="#ffffff" />
                  <Text className="text-sm font-bold text-white tracking-wider">
                    {loading ? "REGISTRAZIONE..." : "REGISTRATI"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.back()}
              className="items-center"
            >
              <Text className="text-sm text-white/60">
                Hai già un account?{" "}
                <Text className="text-orange font-semibold">Accedi</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
