import TouchFeedback from "@/components/TouchFeedback";
import VeicoloSwitcher from "@/components/utente/VeicoloSwitcher";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/* card disposte in cerchio come nel frontend web (functions-app.js):
   angoli -90 / -18 / 54 / 126 / 198, raggio 0.8 * metà scena */
const CARDS = [
  {
    angle: -90,
    icon: "car",
    label: "INFO\nVEICOLO",
    accent: "#2b88b8",
    iconColor: "#60b8e0",
    route: "/(utente)/info-veicolo",
  },
  {
    angle: -18,
    icon: "calendar-check",
    label: "STORICO\nINTERVENTI",
    accent: "#0f766e",
    iconColor: "#34d399",
    route: "/(utente)/storico",
  },
  {
    angle: 54,
    icon: "star",
    label: "RECENSIONI",
    accent: "#8e44ad",
    iconColor: "#a78bfa",
    route: "/(utente)/recensioni",
  },
  {
    angle: 126,
    icon: "wrench",
    label: "PRENOTA\nAPPUNTAMENTO",
    accent: "#f39c12",
    iconColor: "#fbbf24",
    route: "/(utente)/prenotazioni",
  },
  {
    angle: 198,
    icon: "triangle-exclamation",
    label: "SEGNA\nPROBLEMI",
    accent: "#d14019",
    iconColor: "#f87171",
    route: "/(utente)/problemi",
  },
] as const;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { utente, veicoli, veicoloAttivo, seleziona, elimina, logout } =
    useVeicoli();

  const [menuAperto, setMenuAperto] = useState(false);
  const [avatarAperto, setAvatarAperto] = useState(false);

  /* dimensioni scena circolare (come .cards-scene responsive del web) */
  const scene = Math.min(width * 0.92, height - 330, 400);
  const cardSize = Math.max(76, scene * 0.24);
  const centerSize = Math.max(58, scene * 0.19);
  const raggio = (scene / 2) * 0.8;

  const cardAnims = useRef(CARDS.map(() => new Animated.Value(0))).current;
  const pulseAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0)),
  ).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const hamburgerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* entrata card a molla, sfalsata */
    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 150 + i * 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.6)),
      }).start();
    });

    /* onde pulse dal bottone centrale (cards-pulse del web) */
    const timers = pulseAnims.map((anim, i) =>
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.delay(4000),
          ]),
        ).start();
      }, i * 400),
    );

    /* anello tratteggiato in rotazione (cards-spin-ring, 20s) */
    Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    /* glow del bottone centrale (btn-glow, 3s) */
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    return () => timers.forEach(clearTimeout);
  }, [cardAnims, pulseAnims, ringAnim, glowAnim]);

  function apriMenu() {
    setMenuAperto(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function chiudiMenu() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setMenuAperto(false));
  }

  /* stesse voci della sidebar web (Contatti è un link morto anche lì) */
  const menuItems = [
    { icon: "user", label: "Il mio account", route: "/(utente)/account" },
    { icon: "car", label: "Veicolo", route: "/(utente)/veicoli" },
    { icon: "credit-card", label: "Abbonamenti", route: "/(utente)/abbonamenti" },
    { icon: "circle-info", label: "Info e domande utili", route: "/(utente)/info-domande" },
    { icon: "envelope", label: "Contatti", route: null },
    { icon: "file-shield", label: "Termini e privacy policy", route: "/(utente)/termini-privacy" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-orange/15">
        <TouchFeedback
          onPress={menuAperto ? chiudiMenu : apriMenu}
          scaleTo={0.8}
          hitSlop={12}
          style={{
            width: 24,
            height: 18,
            justifyContent: "space-between",
            padding: 1,
          }}
        >
          <Animated.View
            style={{
              width: 20,
              height: 1.5,
              borderRadius: 2,
              backgroundColor: "#a0a8b8",
              transform: [
                {
                  translateY: hamburgerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 7.5],
                  }),
                },
                {
                  rotate: hamburgerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "45deg"],
                  }),
                },
              ],
            }}
          />
          <Animated.View
            style={{
              width: 20,
              height: 1.5,
              borderRadius: 2,
              backgroundColor: "#a0a8b8",
              opacity: hamburgerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            }}
          />
          <Animated.View
            style={{
              width: 20,
              height: 1.5,
              borderRadius: 2,
              backgroundColor: "#a0a8b8",
              transform: [
                {
                  translateY: hamburgerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -7.5],
                  }),
                },
                {
                  rotate: hamburgerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "-45deg"],
                  }),
                },
              ],
            }}
          />
        </TouchFeedback>
        {/* sul sito il logo riporta alla home: qui siamo già in home,
            quindi rimbalza soltanto per dare comunque risposta al tocco */}
        <TouchFeedback scaleTo={0.9} onPress={() => {}}>
          <Text className="text-xl font-extrabold text-orange tracking-widest">
            RE|CARS
          </Text>
        </TouchFeedback>
        <TouchFeedback
          scaleTo={0.82}
          hitSlop={8}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#f97316",
            alignItems: "center",
            justifyContent: "center",
          }}
          pressedStyle={{ backgroundColor: "#fb923c" }}
          onPress={() => setAvatarAperto(true)}
        >
          <Text className="text-xs font-bold text-white">
            {utente?.username?.charAt(0).toUpperCase() ?? "U"}
          </Text>
        </TouchFeedback>
      </View>

      {/* switcher unificato in un unico pill centrale */}
      <View className="py-3 border-b border-white/5">
        <VeicoloSwitcher
          veicoli={veicoli}
          veicoloAttivo={veicoloAttivo}
          onSeleziona={seleziona}
          onAggiungi={() => router.push("/(utente)/cerca-veicolo")}
          onElimina={elimina}
        />
      </View>

      {/* scena circolare */}
      <View className="flex-1 items-center justify-center">
        <View style={{ width: scene, height: scene }}>
          {/* anello tratteggiato rotante */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: scene / 2 - raggio,
              left: scene / 2 - raggio,
              width: raggio * 2,
              height: raggio * 2,
              borderRadius: raggio,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(249,115,22,0.25)",
              transform: [
                {
                  rotate: ringAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          />

          {/* onde pulse dal centro */}
          {pulseAnims.map((anim, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                top: scene / 2 - centerSize / 2,
                left: scene / 2 - centerSize / 2,
                width: centerSize,
                height: centerSize,
                borderRadius: centerSize / 2,
                borderWidth: 2,
                borderColor: "rgba(249,115,22,0.5)",
                opacity: anim.interpolate({
                  inputRange: [0, 0.01, 1],
                  outputRange: [0, 0.7, 0],
                }),
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 3.2],
                    }),
                  },
                ],
              }}
            />
          ))}

          {/* card in cerchio */}
          {CARDS.map((card, i) => {
            const rad = (card.angle * Math.PI) / 180;
            const x = scene / 2 + Math.cos(rad) * raggio;
            const y = scene / 2 + Math.sin(rad) * raggio;
            return (
              <Animated.View
                key={card.route}
                style={{
                  position: "absolute",
                  left: x - cardSize / 2,
                  top: y - cardSize / 2,
                  width: cardSize,
                  height: cardSize,
                  opacity: cardAnims[i],
                  transform: [
                    {
                      scale: cardAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ],
                }}
              >
                <TouchFeedback
                  onPress={() => router.push(card.route as any)}
                  haptic="medium"
                  scaleTo={0.88}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: "#141445",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    overflow: "hidden",
                  }}
                  pressedStyle={{
                    backgroundColor: "#1b1b58",
                    borderColor: `${card.accent}99`,
                  }}
                >
                  <View
                    style={{
                      width: cardSize * 0.36,
                      height: cardSize * 0.36,
                      borderRadius: cardSize * 0.18,
                      backgroundColor: `${card.accent}22`,
                      borderWidth: 1.5,
                      borderColor: `${card.accent}55`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome6
                      name={card.icon as any}
                      size={cardSize * 0.16}
                      color={card.iconColor}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "700",
                      letterSpacing: 0.5,
                      lineHeight: 11,
                      textAlign: "center",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {card.label}
                  </Text>
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      backgroundColor: card.accent,
                    }}
                  />
                </TouchFeedback>
              </Animated.View>
            );
          })}

          {/* bottone CERCA sempre al centro */}
          <Animated.View
            style={{
              position: "absolute",
              top: scene / 2 - centerSize / 2,
              left: scene / 2 - centerSize / 2,
              width: centerSize,
              height: centerSize,
              borderRadius: centerSize / 2,
              borderWidth: 2,
              borderColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["rgba(249,115,22,0.4)", "rgba(249,115,22,0.9)"],
              }),
              shadowColor: "#f97316",
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 12,
              shadowOpacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.6],
              }) as any,
              backgroundColor: "#010130",
            }}
          >
            <TouchFeedback
              onPress={() => router.push("/(utente)/cerca-veicolo")}
              haptic="medium"
              scaleTo={0.85}
              style={{
                flex: 1,
                borderRadius: centerSize / 2,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
              pressedStyle={{ backgroundColor: "rgba(249,115,22,0.18)" }}
            >
              <FontAwesome6
                name="magnifying-glass"
                size={centerSize * 0.24}
                color="#f97316"
              />
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: "rgba(249,115,22,0.8)",
                }}
              >
                CERCA
              </Text>
            </TouchFeedback>
          </Animated.View>
        </View>
      </View>

      {/* hamburger menu laterale */}
      <Modal
        visible={menuAperto}
        transparent
        animationType="fade"
        onRequestClose={chiudiMenu}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={chiudiMenu}
        />
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 230,
            backgroundColor: "#141445",
            borderRightWidth: 0.5,
            borderColor: "rgba(249,115,22,0.2)",
            paddingTop: Math.max(insets.top, 54) + 16,
            paddingHorizontal: 16,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {/* X per chiudere */}
          <TouchFeedback
            onPress={chiudiMenu}
            scaleTo={0.8}
            hitSlop={8}
            style={{
              position: "absolute",
              top: Math.max(insets.top, 54) + 16,
              right: 10,
              width: 35,
              height: 30,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {({ pressed }) => (
              <FontAwesome6
                name="xmark"
                size={18}
                color={pressed ? "#f97316" : "#a0a8b8"}
              />
            )}
          </TouchFeedback>

          {/* header titolo */}
          <View
            style={{
              alignItems: "center",
              marginBottom: 24,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#f97316",
                letterSpacing: 1.2,
              }}
            >
              RE|CARS
            </Text>
          </View>

          {/* voci semplici senza sfondo/contorno, come .sidebar-nav a del web */}
          <View style={{ flex: 1, gap: 4, paddingBottom: insets.bottom + 20 }}>
            {menuItems.map((item, i) => (
              <TouchFeedback
                key={i}
                onPress={() => {
                  if (!item.route) return;
                  chiudiMenu();
                  router.push(item.route as any);
                }}
                scaleTo={0.96}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
                /* alla pressione si accende come l'hover arancione del sito */
                pressedStyle={{ backgroundColor: "rgba(249,115,22,0.16)" }}
              >
                {({ pressed }) => (
                  <>
                    <View className="w-5 items-center">
                      <FontAwesome6
                        name={item.icon as any}
                        size={14}
                        color={pressed ? "#f97316" : "#a0a8b8"}
                      />
                    </View>
                    <Text
                      className="flex-1 text-sm"
                      style={{
                        color: pressed ? "#f97316" : "#a0a8b8",
                        fontWeight: pressed ? "600" : "400",
                      }}
                    >
                      {item.label}
                    </Text>
                  </>
                )}
              </TouchFeedback>
            ))}
            {/* .sidebar-logout: rosso, spinto in fondo */}
            <TouchFeedback
              onPress={() => {
                chiudiMenu();
                logout();
              }}
              scaleTo={0.96}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                marginTop: "auto",
              }}
              pressedStyle={{ backgroundColor: "rgba(235,32,32,0.14)" }}
            >
              {({ pressed }) => (
                <>
                  <View className="w-5 items-center">
                    <FontAwesome6
                      name="right-from-bracket"
                      size={14}
                      color={pressed ? "#ff5252" : "#eb2020"}
                    />
                  </View>
                  <Text
                    className="text-sm"
                    style={{ color: pressed ? "#ff5252" : "#eb2020" }}
                  >
                    Logout
                  </Text>
                </>
              )}
            </TouchFeedback>
          </View>
        </Animated.View>
      </Modal>

      {/* avatar dropdown */}
      <Modal
        visible={avatarAperto}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarAperto(false)}
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={() => setAvatarAperto(false)}
        />
        <View
          style={{
            position: "absolute",
            top: 90,
            right: 16,
            backgroundColor: "#141445",
            borderRadius: 14,
            padding: 4,
            borderWidth: 0.5,
            borderColor: "rgba(249,115,22,0.2)",
            minWidth: 190,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}
        >
          <View
            style={{
              padding: 12,
              borderBottomWidth: 0.5,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text style={{ fontSize: 11, color: "#a0a8b8" }}>Ciao,</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#e8e8ff" }}>
              {utente?.username ?? "—"}
            </Text>
          </View>
          <TouchFeedback
            onPress={() => {
              setAvatarAperto(false);
              router.push("/(utente)/account");
            }}
            scaleTo={0.96}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 10,
            }}
            pressedStyle={{ backgroundColor: "rgba(249,115,22,0.16)" }}
          >
            {({ pressed }) => (
              <>
                <FontAwesome6 name="user" size={13} color="#f97316" />
                <Text
                  style={{ fontSize: 13, color: pressed ? "#f97316" : "#e8e8ff" }}
                >
                  Il mio account
                </Text>
              </>
            )}
          </TouchFeedback>
          <TouchFeedback
            onPress={() => {
              setAvatarAperto(false);
              logout();
            }}
            scaleTo={0.96}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 10,
              borderTopWidth: 0.5,
              borderColor: "rgba(255,255,255,0.06)",
            }}
            pressedStyle={{ backgroundColor: "rgba(229,57,53,0.14)" }}
          >
            <FontAwesome6 name="right-from-bracket" size={13} color="#e53935" />
            <Text style={{ fontSize: 13, color: "#e53935" }}>Logout</Text>
          </TouchFeedback>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
