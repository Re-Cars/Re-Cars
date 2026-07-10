import TouchFeedback from "@/components/TouchFeedback";
import { logoutGlobale } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* timing del sito: transform 0.4s cubic-bezier(0.68,-0.55,0.265,1.55),
   opacity/top 0.3s ease (vedi .hamburger9 .line in style-app.css) */
const HAMBURGER_BOUNCE = Easing.bezier(0.68, -0.55, 0.265, 1.55);
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/* hamburger9 del web: 4 linee 30x4 arancio #ff6b2b; da aperto la 1 e la 4
   collassano al centro (scale 0 + fade), la 2 e la 3 ruotano a ±45° (X) */
function HamburgerIcon({
  anim,
  fade,
}: {
  anim: Animated.Value;
  fade: Animated.Value;
}) {
  const lineBase = {
    position: "absolute" as const,
    left: 0,
    width: 30,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#ff6b2b",
  };
  const collapseOpacity = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const collapseScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  return (
    <View style={{ width: 30, height: 30 }}>
      {/* line1: top 3 → 13, scale(0), fade */}
      <Animated.View
        style={[
          lineBase,
          {
            top: 3,
            opacity: collapseOpacity,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10],
                }),
              },
              { scale: collapseScale },
            ],
          },
        ]}
      />
      {/* line2: rotate(45deg) */}
      <Animated.View
        style={[
          lineBase,
          {
            top: 13,
            transform: [
              {
                rotate: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          },
        ]}
      />
      {/* line3: rotate(-45deg) */}
      <Animated.View
        style={[
          lineBase,
          {
            top: 13,
            transform: [
              {
                rotate: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "-45deg"],
                }),
              },
            ],
          },
        ]}
      />
      {/* line4: top 23 → 13, scale(0), fade */}
      <Animated.View
        style={[
          lineBase,
          {
            top: 23,
            opacity: collapseOpacity,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
              { scale: collapseScale },
            ],
          },
        ]}
      />
    </View>
  );
}

/* stesse voci della sidebar web (Contatti è un link morto anche lì) */
const MENU_ITEMS = [
  { icon: "user", label: "Il mio account", route: "/(utente)/account" },
  { icon: "car", label: "Veicolo", route: "/(utente)/veicoli" },
  { icon: "credit-card", label: "Abbonamenti", route: "/(utente)/abbonamenti" },
  {
    icon: "circle-info",
    label: "Info e domande utili",
    route: "/(utente)/info-domande",
  },
  { icon: "envelope", label: "Contatti", route: null },
  {
    icon: "file-shield",
    label: "Termini e privacy policy",
    route: "/(utente)/termini-privacy",
  },
] as const;

/**
 * Hamburger + sidebar di navigazione, come sul sito web dove l'hamburger9
 * e la sidebar sono presenti in tutte le pagine dell'area utente.
 * Autonomo: basta piazzarlo nell'header di qualsiasi schermata.
 */
export default function MenuLaterale() {
  const insets = useSafeAreaInsets();
  const [menuAperto, setMenuAperto] = useState(false);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const hamburgerAnim = useRef(new Animated.Value(0)).current;
  const hamburgerFade = useRef(new Animated.Value(0)).current;

  /* sidebar web: transition left 0.3s ease; hamburger→X: transform 0.4s
     bounce-bezier + opacity/top 0.3s ease, identico in apertura e chiusura */
  function apriMenu() {
    setMenuAperto(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerAnim, {
        toValue: 1,
        duration: 400,
        easing: HAMBURGER_BOUNCE,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerFade, {
        toValue: 1,
        duration: 300,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function chiudiMenu(dopo?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerAnim, {
        toValue: 0,
        duration: 400,
        easing: HAMBURGER_BOUNCE,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerFade, {
        toValue: 0,
        duration: 300,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuAperto(false);
      dopo?.();
    });
  }

  return (
    <>
      <TouchFeedback
        onPress={() => (menuAperto ? chiudiMenu() : apriMenu())}
        scaleTo={0.9}
        hitSlop={12}
      >
        <HamburgerIcon anim={hamburgerAnim} fade={hamburgerFade} />
      </TouchFeedback>

      {/* hamburger menu laterale */}
      <Modal
        visible={menuAperto}
        transparent
        animationType="fade"
        onRequestClose={() => chiudiMenu()}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => chiudiMenu()}
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
          {/* hamburger a X per chiudere: sul sito lo stesso hamburger9
              si sposta dentro la sidebar quando è aperta */}
          <TouchFeedback
            onPress={() => chiudiMenu()}
            scaleTo={0.9}
            hitSlop={8}
            style={{
              position: "absolute",
              top: Math.max(insets.top, 54) + 16,
              right: 12,
            }}
          >
            <HamburgerIcon anim={hamburgerAnim} fade={hamburgerFade} />
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
            {MENU_ITEMS.map((item, i) => (
              <TouchFeedback
                key={i}
                onPress={() => {
                  if (!item.route) return;
                  chiudiMenu(() => router.push(item.route as any));
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
              onPress={() => chiudiMenu(() => logoutGlobale())}
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
    </>
  );
}
