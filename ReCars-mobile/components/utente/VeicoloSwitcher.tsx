import TouchFeedback from "@/components/TouchFeedback";
import { Veicolo } from "@/constants/api";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  veicoli: Veicolo[];
  veicoloAttivo: Veicolo | null;
  onSeleziona: (v: Veicolo) => void;
  onAggiungi: () => void;
  onElimina?: (id: number) => Promise<boolean>;
};

/* easing "ease" CSS, usato dalle transition del sito */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * Switcher unificato in un unico pill centrale (versione ≤480px del
 * frontend web): veicolo attivo + targa + contatore garage + chevron.
 * Il dropdown si apre sotto il pill, centrato, scendendo dall'alto con
 * slide+fade — come .switcher-dropdown di style-app.css.
 */
export default function VeicoloSwitcher({
  veicoli,
  veicoloAttivo,
  onSeleziona,
  onAggiungi,
  onElimina,
}: Props) {
  const { width } = useWindowDimensions();
  const [aperto, setAperto] = useState(false);
  const [daEliminare, setDaEliminare] = useState<Veicolo | null>(null);
  const [dropTop, setDropTop] = useState(0);

  const pillRef = useRef<View>(null);
  /* apertura dropdown: slide+fade dall'alto */
  const dropAnim = useRef(new Animated.Value(0)).current;
  /* chevron: .switcher-btn.open #switcher-icon { rotate 180deg }, 0.3s */
  const chevronAnim = useRef(new Animated.Value(0)).current;
  /* bordo "Aggiungi veicolo" (sostituto del conic-gradient switcher-trace) */
  const borderAnim = useRef(new Animated.Value(0)).current;
  /* switcher-bounce del cerchietto "+": scale 1 → 1.1, 2.5s infinite */
  const bounceAnim = useRef(new Animated.Value(0)).current;
  /* @keyframes garage-pop / garage-delete di style-app.css: progressione
     0→1 interpolata sui keyframe (JS driver: skew non è supportato
     dal native driver e le due anim sono one-shot sul pill) */
  const popAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  /* garage-pop: scale up con bounce, 3s (web: dopo l'aggiunta veicolo) */
  function animaPop() {
    popAnim.setValue(0);
    Animated.timing(popAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }

  /* garage-delete: shake in skew, 0.6s (web: dopo l'eliminazione) */
  function animaShake() {
    shakeAnim.setValue(0);
    Animated.timing(shakeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }

  /* come checkGarageAnimation() del web: il flag viene messo da
     cerca-veicolo prima del redirect e consumato qui al mount */
  useEffect(() => {
    AsyncStorage.getItem("garage_animation").then((flag) => {
      if (flag !== "true") return;
      AsyncStorage.removeItem("garage_animation");
      setTimeout(animaPop, 300);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [borderAnim, bounceAnim]);

  function apri() {
    /* il dropdown si aggancia sotto il pill (top: calc(100% + 8px) del web) */
    pillRef.current?.measureInWindow((_x, y, _w, h) => {
      setDropTop(y + h + 8);
      setAperto(true);
      dropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(dropAnim, {
          toValue: 1,
          duration: 300,
          easing: EASE,
          useNativeDriver: true,
        }),
        Animated.timing(chevronAnim, {
          toValue: 1,
          duration: 300,
          easing: EASE,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function chiudi(dopo?: () => void) {
    Animated.parallel([
      Animated.timing(dropAnim, {
        toValue: 0,
        duration: 200,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(chevronAnim, {
        toValue: 0,
        duration: 300,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAperto(false);
      dopo?.();
    });
  }

  const iconaTipo = veicoloAttivo?.tipo === "motorcycle" ? "motorcycle" : "car";

  return (
    <>
      {/* pill unificato centrale; il wrapper anima garage-pop (scale con
          bounce + glow) e garage-delete (shake in skew) come .switcher-btn */}
      <View ref={pillRef} collapsable={false} style={{ alignSelf: "center" }}>
        <Animated.View
          style={{
            /* liquid glass come la bottom nav: vetro satinato bianco,
               bordo fisso senza respiro */
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: "rgba(255,255,255,0.15)",
            shadowColor: "#f97316",
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 14,
            shadowOpacity: popAnim.interpolate({
              inputRange: [0, 0.15, 0.5, 1],
              outputRange: [0, 0.6, 0.35, 0],
            }) as any,
            transform: [
              {
                scale: popAnim.interpolate({
                  inputRange: [0, 0.15, 0.35, 0.5, 0.65, 0.8, 1],
                  outputRange: [1, 1.3, 0.92, 1.2, 0.96, 1.1, 1],
                }),
              },
              {
                skewX: shakeAnim.interpolate({
                  inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                  outputRange: [
                    "0deg",
                    "-8deg",
                    "6deg",
                    "-4deg",
                    "3deg",
                    "-2deg",
                    "1deg",
                    "0deg",
                  ],
                }),
              },
              {
                skewY: shakeAnim.interpolate({
                  inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                  outputRange: [
                    "0deg",
                    "-8deg",
                    "6deg",
                    "-4deg",
                    "3deg",
                    "-2deg",
                    "1deg",
                    "0deg",
                  ],
                }),
              },
            ],
          }}
        >
          <TouchFeedback
            onPress={() => (aperto ? chiudi() : apri())}
            scaleTo={0.95}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
            pressedStyle={{
              backgroundColor: "rgba(255,255,255,0.16)",
            }}
          >
            <FontAwesome6 name={iconaTipo} size={12} color="#f97316" />
            <Text className="text-xs font-medium text-white" numberOfLines={1}>
              {veicoloAttivo?.nome ?? "Nessun veicolo"}
            </Text>
            {veicoloAttivo && (
              <>
                <Text className="text-xs text-muted">·</Text>
                <View className="bg-orange/15 border border-orange/30 rounded px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-orange tracking-widest">
                    {veicoloAttivo.targa}
                  </Text>
                </View>
              </>
            )}
            <View className="flex-row items-center gap-1 ml-1">
              <FontAwesome6 name="warehouse" size={10} color="#f97316" />
              {veicoli.length > 0 && (
                <View className="bg-orange/20 rounded-full px-1.5">
                  <Text className="text-[10px] font-bold text-orange">
                    {veicoli.length}
                  </Text>
                </View>
              )}
            </View>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: chevronAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              }}
            >
              <FontAwesome6 name="chevron-down" size={9} color="#f97316" />
            </Animated.View>
          </TouchFeedback>
        </Animated.View>
      </View>

      {/* dropdown garage: scende dall'alto, centrato sotto il pill */}
      <Modal
        visible={aperto}
        transparent
        animationType="none"
        onRequestClose={() => chiudi()}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => chiudi()}
        />
        <Animated.View
          style={{
            position: "absolute",
            top: dropTop,
            left: 0,
            right: 0,
            alignItems: "center",
            opacity: dropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: dropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          }}
        >
          {/* .switcher-dropdown */}
          <View
            style={{
              backgroundColor: "#141445",
              borderWidth: 1,
              borderColor: "rgba(249,115,22,0.3)",
              borderRadius: 14,
              padding: 8,
              minWidth: 280,
              maxWidth: width - 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 15,
              elevation: 16,
            }}
          >
            <FlatList
              data={veicoli}
              keyExtractor={(v) => String(v.id)}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const attivo = item.id === veicoloAttivo?.id;
                return (
                  /* .switcher-item (+ .attivo) */
                  <TouchFeedback
                    onPress={() =>
                      chiudi(() => {
                        onSeleziona(item);
                      })
                    }
                    scaleTo={0.97}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      marginBottom: 4,
                      backgroundColor: attivo
                        ? "rgba(249,115,22,0.15)"
                        : "transparent",
                    }}
                    pressedStyle={{ backgroundColor: "rgba(249,115,22,0.1)" }}
                  >
                    <View style={{ width: 16, alignItems: "center" }}>
                      <FontAwesome6
                        name={item.tipo === "motorcycle" ? "motorcycle" : "car"}
                        size={13}
                        color="#f97316"
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: attivo ? "700" : "400",
                        color: attivo ? "#f97316" : "rgba(239,129,12,0.7)",
                      }}
                    >
                      {item.nome}
                    </Text>
                    {/* .item-targa */}
                    <View
                      style={{
                        backgroundColor: "rgba(249,115,22,0.2)",
                        borderWidth: 1,
                        borderColor: "#f97316",
                        borderRadius: 5,
                        paddingVertical: 1,
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          letterSpacing: 1,
                          color: "#f97316",
                        }}
                      >
                        {item.targa}
                      </Text>
                    </View>
                    {onElimina && (
                      /* .switcher-delete-btn: il dropdown va chiuso PRIMA di
                         mostrare la conferma — due Modal fratelli visibili
                         insieme non sono supportati da react-native e la
                         conferma non compare (il web fa lo stesso con
                         closeSwitcher()) */
                      <TouchFeedback
                        onPress={() => chiudi(() => setDaEliminare(item))}
                        hitSlop={8}
                        scaleTo={0.8}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 6,
                          borderRadius: 6,
                          marginLeft: 4,
                        }}
                        pressedStyle={{
                          backgroundColor: "rgba(255,107,107,0.1)",
                        }}
                      >
                        {({ pressed }) => (
                          <FontAwesome6
                            name="trash"
                            size={12}
                            color={
                              pressed ? "#ff6b6b" : "rgba(255,107,107,0.5)"
                            }
                          />
                        )}
                      </TouchFeedback>
                    )}
                  </TouchFeedback>
                );
              }}
              ListEmptyComponent={
                <Text className="text-xs text-muted text-center py-4">
                  Nessun veicolo nel garage.
                </Text>
              }
            />

            {/* .switcher-aggiungi */}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: "rgba(249,115,22,0.15)",
                marginTop: 4,
                paddingTop: 6,
                paddingBottom: 2,
                alignItems: "center",
              }}
            >
              <Animated.View
                style={{
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: borderAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["rgba(249,115,22,0.4)", "rgba(249,115,22,1)"],
                  }),
                  shadowColor: "#f97316",
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 10,
                  shadowOpacity: borderAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.15, 0.5],
                  }) as any,
                }}
              >
                <TouchFeedback
                  onPress={() => chiudi(onAggiungi)}
                  haptic="medium"
                  scaleTo={0.94}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 18,
                    paddingVertical: 6,
                    paddingHorizontal: 20,
                  }}
                  pressedStyle={{ backgroundColor: "rgba(249,115,22,0.12)" }}
                >
                  {/* .switcher-plus-circle con switcher-bounce */}
                  <Animated.View
                    style={{
                      transform: [
                        {
                          scale: bounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1],
                          }),
                        },
                      ],
                    }}
                  >
                    <LinearGradient
                      colors={["#f97316", "#ea580c"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome6 name="plus" size={10} color="#fff" />
                    </LinearGradient>
                  </Animated.View>
                  <Text
                    style={{
                      color: "rgba(249,115,22,0.85)",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Aggiungi veicolo
                  </Text>
                </TouchFeedback>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {/* conferma elimina */}
      <Modal
        visible={daEliminare !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDaEliminare(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#141445",
              borderRadius: 18,
              padding: 26,
              maxWidth: 320,
              width: "88%",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: "rgba(255,107,107,0.2)",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "rgba(255,107,107,0.1)",
                borderWidth: 1.5,
                borderColor: "rgba(255,107,107,0.3)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <FontAwesome6
                name="triangle-exclamation"
                size={18}
                color="#ff6b6b"
              />
            </View>
            <Text className="text-base font-bold text-white">
              Elimina veicolo
            </Text>
            <Text className="text-sm text-muted text-center leading-5">
              Vuoi rimuovere{" "}
              <Text className="font-bold text-white">{daEliminare?.nome}</Text>{" "}
              dal tuo garage?
            </Text>
            <View className="flex-row gap-2.5 w-full mt-2">
              <TouchFeedback
                onPress={() => setDaEliminare(null)}
                scaleTo={0.95}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                }}
                pressedStyle={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <Text className="text-sm font-semibold text-muted">
                  Annulla
                </Text>
              </TouchFeedback>
              <TouchFeedback
                onPress={async () => {
                  const v = daEliminare;
                  setDaEliminare(null);
                  if (!v || !onElimina) return;
                  const ok = await onElimina(v.id);
                  /* shake sul pill a eliminazione riuscita (garage-delete);
                     in caso di errore feedback esplicito come l'alert web */
                  if (ok) animaShake();
                  else
                    Alert.alert(
                      "Errore",
                      "Errore durante l'eliminazione del veicolo.",
                    );
                }}
                haptic="heavy"
                scaleTo={0.95}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: "#ff6b6b",
                }}
                pressedStyle={{ backgroundColor: "#ff5252" }}
              >
                <Text className="text-sm font-bold text-white">Elimina</Text>
              </TouchFeedback>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
