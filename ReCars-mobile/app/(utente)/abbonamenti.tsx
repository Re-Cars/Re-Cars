import TouchFeedback from "@/components/TouchFeedback";
import SectionScreen from "@/components/utente/SectionScreen";
import { apiFetch } from "@/constants/api";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Text,
  View,
} from "react-native";

/* palette dark del web (style-base.css): --surface, --muted, --success */
const SURFACE = "#141445";
const MUTED = "#a0a8b8";
const SUCCESS = "#37a961";
const ORANGE = "#f97316";

/* easing "ease" CSS delle transition/animation del sito */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/* piani come abbonamenti.html (Base / Premium / Pro) */
const PIANI = [
  {
    id: "base",
    nome: "Base",
    prezzo: "Gratis",
    periodo: "",
    desc: "Per iniziare a gestire i tuoi veicoli",
    popolare: false,
    features: [
      { ok: true, label: "1 veicolo" },
      { ok: true, label: "Storico interventi base" },
      { ok: true, label: "Notifiche scadenze" },
      { ok: false, label: "Prenotazione officine" },
      { ok: false, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "premium",
    nome: "Premium",
    prezzo: "4,99€",
    periodo: "/mese",
    desc: "Per chi vuole il massimo dalla propria auto",
    popolare: true,
    features: [
      { ok: true, label: "Fino a 5 veicoli" },
      { ok: true, label: "Storico completo interventi" },
      { ok: true, label: "Notifiche personalizzate" },
      { ok: true, label: "Prenotazione officine" },
      { ok: true, label: "Recensioni officine" },
      { ok: false, label: "Supporto prioritario" },
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    prezzo: "9,99€",
    periodo: "/mese",
    desc: "Per chi gestisce più veicoli e vuole tutto",
    popolare: false,
    features: [
      { ok: true, label: "Veicoli illimitati" },
      { ok: true, label: "Storico + grafici costi" },
      { ok: true, label: "Notifiche avanzate" },
      { ok: true, label: "Prenotazione prioritaria" },
      { ok: true, label: "Recensioni + community" },
      { ok: true, label: "Supporto prioritario" },
    ],
  },
] as const;

const NOMI_PIANI: Record<string, string> = {
  base: "Base",
  premium: "Premium",
  pro: "Pro",
};

type PianoId = (typeof PIANI)[number]["id"];

export default function AbbonamentiScreen() {
  const { utente, veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  /* stato reale abbonamento (come caricaPianoAttivo di
     functions-abbonamenti.js: GET /auth/utente/:id → abbonamento[0]) */
  const [piano, setPiano] = useState<string | null>(null);
  const [pianoSub, setPianoSub] = useState("");
  const [errore, setErrore] = useState(false);
  const [checkoutInCorso, setCheckoutInCorso] = useState<string | null>(null);

  const caricaPianoAttivo = useCallback(async () => {
    if (!utente) return;
    setErrore(false);
    try {
      const res = await apiFetch(`/auth/utente/${utente.id}`);
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const abbonamento = data.abbonamento?.[0];
      const p = abbonamento?.piano || "base";
      setPiano(p);
      setPianoSub(
        abbonamento?.data_fine
          ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString("it-IT")}`
          : p === "base"
            ? "Piano gratuito · Nessun rinnovo"
            : "Rinnovo automatico mensile",
      );
    } catch (err) {
      console.error("Errore caricamento piano:", err);
      setErrore(true);
    }
  }, [utente]);

  useEffect(() => {
    caricaPianoAttivo();
  }, [caricaPianoAttivo]);

  /* ---- animazioni ---- */

  /* abb-fadeUp: solo transform translateY 12→0, 0.5s ease,
     delay 0 / 0.06s / 0.12s per le tre card */
  const cardAnims = useRef(PIANI.map(() => new Animated.Value(12))).current;
  /* abb-dot-pulse: opacity 1 → 0.4 → 1, 2s infinite */
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 500,
        delay: i * 60,
        easing: EASE,
        useNativeDriver: true,
      }).start();
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [cardAnims, dotAnim]);

  const dotOpacity = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.4],
  });

  /* ---- azioni (come functions-abbonamenti.js) ---- */

  async function avviaCheckout(p: PianoId) {
    if (checkoutInCorso) return;
    setCheckoutInCorso(p);
    try {
      /* come sul web il baseUrl è l'origine corrente: qui è il deep link
         dell'app (recarsmobile:// in build, exp://... in Expo Go); il
         backend ci appende /pagamento.html e /abbonamenti.html */
      const baseUrl = Linking.createURL("").replace(/\/$/, "");

      const res = await apiFetch("/abbonamento/checkout", {
        method: "POST",
        body: JSON.stringify({ piano: p, baseUrl }),
      });
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error("Errore checkout:", data);
        setErrore(true);
        return;
      }

      /* checkout hosted di Stripe: si chiude da solo quando Stripe
         redirige al deep link di success/cancel */
      await WebBrowser.openAuthSessionAsync(data.url, baseUrl);

      /* al ritorno il webhook ha già aggiornato l'abbonamento */
      await caricaPianoAttivo();
    } catch (err) {
      console.error("Errore avvio checkout:", err);
      setErrore(true);
    } finally {
      setCheckoutInCorso(null);
    }
  }

  async function disdiciAbbonamento() {
    if (checkoutInCorso) return;
    setCheckoutInCorso("base");
    try {
      const res = await apiFetch("/abbonamento/disdici", { method: "POST" });
      if (res.status === 401) {
        await logoutGlobale();
        return;
      }
      if (res.ok) await caricaPianoAttivo();
    } catch (err) {
      console.error("Errore disdetta:", err);
    } finally {
      setCheckoutInCorso(null);
    }
  }

  const caricamentoPiano = piano === null && !errore;

  return (
    <SectionScreen
      titolo="Abbonamenti"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* banner piano attivo (.abb-piano-attivo) */}
      <View
        style={{
          backgroundColor: SURFACE,
          borderRadius: 16,
          paddingVertical: 18,
          paddingHorizontal: 22,
          borderWidth: 1,
          borderColor: errore
            ? "rgba(255,107,107,0.55)"
            : "rgba(55,169,97,0.55)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        {errore ? (
          <>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: "700",
                  color: "#ff6b6b",
                }}
              >
                Errore
              </Text>
              <Text style={{ fontSize: 12.5, color: MUTED }}>
                Impossibile caricare il tuo abbonamento.
              </Text>
            </View>
            <TouchFeedback
              onPress={() => {
                setPiano(null);
                caricaPianoAttivo();
              }}
              scaleTo={0.95}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                borderRadius: 20,
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: "rgba(249,115,22,0.5)",
                backgroundColor: "rgba(249,115,22,0.12)",
              }}
              pressedStyle={{ backgroundColor: "rgba(249,115,22,0.25)" }}
            >
              <FontAwesome6 name="rotate-right" size={11} color={ORANGE} />
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: ORANGE }}
              >
                Riprova
              </Text>
            </TouchFeedback>
          </>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: "700",
                  color: SUCCESS,
                }}
              >
                Piano attivo
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#ffffff" }}
              >
                {caricamentoPiano ? "—" : (NOMI_PIANI[piano!] ?? piano)}
              </Text>
              <Text style={{ fontSize: 12.5, color: MUTED }}>
                {caricamentoPiano ? "—" : pianoSub}
              </Text>
            </View>
            {caricamentoPiano ? (
              <ActivityIndicator color={ORANGE} />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  backgroundColor: "rgba(55,169,97,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(55,169,97,0.5)",
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                }}
              >
                <Animated.View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: SUCCESS,
                    opacity: dotOpacity,
                  }}
                />
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: SUCCESS }}
                >
                  Attivo
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* .abb-section-title */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 22,
        }}
      >
        Scegli il tuo piano
      </Text>

      <View style={{ gap: 20 }}>
        {PIANI.map((p, i) => {
          const attuale = piano !== null && p.id === piano;
          const inCorso = checkoutInCorso === p.id;
          return (
            /* .abb-piano-card con abb-fadeUp */
            <Animated.View
              key={p.id}
              style={{
                backgroundColor: SURFACE,
                borderRadius: 18,
                borderWidth: attuale || p.popolare ? 1.7 : 1,
                borderColor: attuale
                  ? "rgba(55,169,97,0.95)"
                  : p.popolare
                    ? ORANGE
                    : "rgba(255,255,255,0.1)",
                shadowColor: attuale ? SUCCESS : p.popolare ? ORANGE : "#000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: attuale || p.popolare ? 0.45 : 0.45,
                shadowRadius: 20,
                elevation: 10,
                transform: [{ translateY: cardAnims[i] }],
              }}
            >
              {/* .abb-popolare-badge / .abb-attivo-badge (top 14, right 14) */}
              {attuale ? (
                <View
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    zIndex: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(55,169,97,0.13)",
                    borderWidth: 1,
                    borderColor: "rgba(55,169,97,0.5)",
                    borderRadius: 20,
                    paddingVertical: 4,
                    paddingHorizontal: 11,
                  }}
                >
                  <Animated.View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: SUCCESS,
                      opacity: dotOpacity,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                      color: SUCCESS,
                    }}
                  >
                    Attivo
                  </Text>
                </View>
              ) : (
                p.popolare && (
                  <View
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      zIndex: 6,
                      backgroundColor: "rgba(249,115,22,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.45)",
                      borderRadius: 20,
                      paddingVertical: 4,
                      paddingHorizontal: 11,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: "700",
                        letterSpacing: 0.3,
                        color: ORANGE,
                      }}
                    >
                      Più popolare
                    </Text>
                  </View>
                )
              )}

              {/* .abb-piano-card-content */}
              <View
                style={{
                  paddingTop: 24,
                  paddingHorizontal: 22,
                  paddingBottom: 22,
                  gap: 14,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      letterSpacing: 0.2,
                      color: "#ffffff",
                    }}
                  >
                    {p.nome}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      marginTop: 6,
                      minHeight: 38,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 30,
                        fontWeight: "800",
                        letterSpacing: -0.5,
                        color: p.id === "base" ? "#ffffff" : ORANGE,
                      }}
                    >
                      {p.prezzo}
                    </Text>
                    {p.periodo !== "" && (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: MUTED,
                          marginLeft: 3,
                        }}
                      >
                        {p.periodo}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      lineHeight: 18,
                      color: MUTED,
                      marginTop: 6,
                    }}
                  >
                    {p.desc}
                  </Text>
                </View>

                {/* .abb-piano-features */}
                <View style={{ gap: 10, marginTop: 2 }}>
                  {p.features.map((f) => (
                    <View
                      key={f.label}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View style={{ width: 16, alignItems: "center" }}>
                        <FontAwesome6
                          name={f.ok ? "check" : "xmark"}
                          size={11}
                          color={f.ok ? SUCCESS : "rgba(160,168,184,0.45)"}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 12.5,
                          color: f.ok ? "#dfe3ec" : "rgba(160,168,184,0.55)",
                        }}
                      >
                        {f.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* .abb-btn: status (piano attuale) / ghost (Passa al Base) /
                    cta (Abbonati ora), come aggiornaPiani() del web */}
                {attuale ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 12,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      marginTop: 4,
                      backgroundColor: "rgba(55,169,97,0.13)",
                      borderWidth: 1,
                      borderColor: "rgba(55,169,97,0.45)",
                    }}
                  >
                    <FontAwesome6 name="check" size={13} color={SUCCESS} />
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: "700",
                        letterSpacing: 0.2,
                        color: SUCCESS,
                      }}
                    >
                      Piano attuale
                    </Text>
                  </View>
                ) : p.id === "base" ? (
                  <TouchFeedback
                    onPress={disdiciAbbonamento}
                    disabled={caricamentoPiano || checkoutInCorso !== null}
                    scaleTo={0.98}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 12,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                    }}
                    pressedStyle={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    {({ pressed }) =>
                      inCorso ? (
                        <ActivityIndicator size="small" color={MUTED} />
                      ) : (
                        <>
                          <FontAwesome6
                            name="rotate-left"
                            size={13}
                            color={pressed ? "#ffffff" : MUTED}
                          />
                          <Text
                            style={{
                              fontSize: 13.5,
                              fontWeight: "700",
                              letterSpacing: 0.2,
                              color: pressed ? "#ffffff" : MUTED,
                            }}
                          >
                            Passa al Base
                          </Text>
                        </>
                      )
                    }
                  </TouchFeedback>
                ) : (
                  /* .abb-btn.cta: gradient 135deg #fb8a3c → #f97316,
                     ombra arancio, press scale 0.98 */
                  <View
                    style={{
                      borderRadius: 12,
                      marginTop: 4,
                      shadowColor: ORANGE,
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.7,
                      shadowRadius: 12,
                      elevation: 8,
                    }}
                  >
                    <TouchFeedback
                      onPress={() => avviaCheckout(p.id)}
                      disabled={caricamentoPiano || checkoutInCorso !== null}
                      haptic="medium"
                      scaleTo={0.98}
                      style={{ borderRadius: 12, overflow: "hidden" }}
                    >
                      <LinearGradient
                        colors={["#fb8a3c", "#f97316"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          paddingVertical: 13,
                          paddingHorizontal: 16,
                        }}
                      >
                        {inCorso ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <FontAwesome6
                              name="credit-card"
                              size={13}
                              color="#ffffff"
                            />
                            <Text
                              style={{
                                fontSize: 13.5,
                                fontWeight: "700",
                                letterSpacing: 0.2,
                                color: "#ffffff",
                              }}
                            >
                              Abbonati ora
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchFeedback>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* .abb-stripe-note */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          backgroundColor: SURFACE,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          marginTop: 22,
        }}
      >
        <FontAwesome6 name="lock" size={14} color={ORANGE} />
        <Text style={{ flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 }}>
          Il pagamento è gestito in modo sicuro da Stripe. Non conserviamo i
          dati della tua carta. Disdici in qualsiasi momento.
        </Text>
      </View>
    </SectionScreen>
  );
}
