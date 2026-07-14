import { NUM_TAB, useNav } from "@/constants/nav-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* spazio riservato al pill flottante: i contenuti lo usano come
   paddingBottom così non finiscono mai sotto la barra */
export const NAV_SPACE = 90;

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const TABS: Tab[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "cerca", label: "Cerca", icon: "search" },
  { key: "prenota", label: "Prenota", icon: "calendar-outline" },
  { key: "storico", label: "Storico", icon: "construct-outline" },
  { key: "account", label: "Account", icon: "person-outline" },
];

/* diametro del cerchio liquid glass dietro l'icona attiva */
const CERCHIO = 48;

/* ingrandimento del cerchio mentre il dito lo trascina */
const SCALA_DRAG = 1.25;

const ARANCIONE = "#f97316";
const BIANCO_SPENTO = "rgba(255,255,255,0.6)";

type Props = {
  /* chiamata con il nuovo indice a ogni cambio tab richiesto dalla
     navbar; se assente si usa cambiaTab del NavContext */
  onTabChange?: (i: number) => void;
};

/**
 * Bottom nav flottante con lo stesso stile pill del VeicoloSwitcher.
 * Un unico cerchio liquid glass indica il tab attivo: al tap scivola
 * sull'icona premuta; trascinando il dito sul pill (stile Instagram/
 * WhatsApp) il cerchio si ingrandisce e segue il dito in continuo, e al
 * rilascio si aggancia a molla sull'icona più vicina tornando alla
 * dimensione normale. Il flusso del cambio è: animazioni →
 * onTabChange(i) → cambiaTab → setTab → effect della home →
 * pagerRef.scrollTo(i * width).
 */
export default function BottomNav({ onTabChange }: Props) {
  const { tab, cambiaTab } = useNav();
  const { width: screenW } = useWindowDimensions();

  /* larghezza della fascia icone, misurata per calcolare gli slot */
  const [rowW, setRowW] = useState(0);
  const slotW = rowW / NUM_TAB;

  /* posizione continua del cerchio in unità di tab (0..4): guida sia il
     translateX del cerchio sia il crossfade dei colori delle icone,
     così l'icona si accende mentre il cerchio le passa sopra */
  const circlePos = useRef(new Animated.Value(tab)).current;
  /* scala del cerchio: 1 a riposo, SCALA_DRAG mentre lo si trascina */
  const circleScale = useRef(new Animated.Value(1)).current;
  /* scala dell'intero pill: si gonfia appena lo si tocca (stile
     Instagram/WhatsApp) e torna a 1 al rilascio */
  const pillScale = useRef(new Animated.Value(1)).current;

  function pillPremuto() {
    Animated.spring(pillScale, {
      toValue: 1.06,
      tension: 300,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }

  function pillRilasciato() {
    Animated.spring(pillScale, {
      toValue: 1,
      tension: 200,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }

  /* ultimo tab su cui abbiamo già animato: evita la doppia animazione
     quando tap/drag anticipano l'aggiornamento del context */
  const animTab = useRef(tab);

  /* slide del cerchio (e dei colori) verso il tab dest */
  function animaVerso(dest: number) {
    if (animTab.current === dest) return;
    animTab.current = dest;
    Animated.timing(circlePos, {
      toValue: dest,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const animaVersoRef = useRef(animaVerso);
  animaVersoRef.current = animaVerso;

  /* cambio tab arrivato da fuori (swipe del pager nella home): anima
     la navbar se tap/drag non l'hanno già fatto */
  useEffect(() => {
    animaVersoRef.current(tab);
  }, [tab]);

  function premi(i: number) {
    animaVerso(i);
    /* la connessione al pager: cambiaTab aggiorna `tab` nel context e
       l'effect di home.tsx chiama scrollTo({ x: i * width }) */
    (onTabChange ?? cambiaTab)(i);
  }

  /* il PanResponder è creato una volta sola: legge lo stato dai ref */
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const premiRef = useRef(premi);
  premiRef.current = premi;
  const slotWRef = useRef(slotW);
  slotWRef.current = slotW;
  /* posizione continua corrente durante il drag e slot sotto il dito */
  const dragPos = useRef(0);
  const dragSlot = useRef(0);

  /* drag sul pill: il cerchio si ingrandisce e segue il dito; al
     rilascio si aggancia allo slot più vicino e lì cambia il tab.
     La fase capture serve a strappare il gesto alle TouchableOpacity
     figlie, altrimenti il trascinamento non parte mai */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        dragPos.current = animTab.current;
        dragSlot.current = animTab.current;
        Animated.spring(circleScale, {
          toValue: SCALA_DRAG,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_e, g) => {
        if (slotWRef.current <= 0) return;
        const v = Math.max(
          0,
          Math.min(NUM_TAB - 1, animTab.current + g.dx / slotWRef.current),
        );
        dragPos.current = v;
        circlePos.setValue(v);
        /* feedback continuo stile iOS quando il dito passa su uno slot */
        const slot = Math.round(v);
        if (slot !== dragSlot.current) {
          dragSlot.current = slot;
          Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderRelease: () => {
        const dest = Math.round(dragPos.current);
        /* aggancio a molla sull'icona più vicina, dimensione normale */
        animTab.current = dest;
        Animated.spring(circlePos, {
          toValue: dest,
          tension: 180,
          friction: 10,
          useNativeDriver: true,
        }).start();
        Animated.spring(circleScale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }).start();
        if (dest !== tabRef.current) premiRef.current(dest);
      },
      onPanResponderTerminate: () => {
        animTab.current = tabRef.current;
        Animated.spring(circlePos, {
          toValue: tabRef.current,
          tension: 180,
          friction: 10,
          useNativeDriver: true,
        }).start();
        Animated.spring(circleScale, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <SafeAreaView
      edges={["bottom"]}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 16,
        alignItems: "center",
      }}
    >
      {/* pill completamente arrotondato, stesso vetro del VeicoloSwitcher.
          La scala segue il dito fisico tramite i touch event raw (che
          bubblano indipendentemente da chi possiede il gesto): sale al
          primo contatto e scende solo quando il dito lascia lo schermo */}
      <Animated.View
        {...pan.panHandlers}
        onTouchStart={pillPremuto}
        onTouchEnd={(e) => {
          if (e.nativeEvent.touches.length === 0) pillRilasciato();
        }}
        onTouchCancel={pillRilasciato}
        style={{
          width: screenW - 40,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 0.5,
          borderColor: "rgba(255,255,255,0.15)",
          borderRadius: 999,
          overflow: "hidden",
          paddingHorizontal: 14,
          paddingVertical: 6,
          flexDirection: "row",
          alignItems: "center",
          transform: [{ scale: pillScale }],
        }}
      >
        <View
          onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            minHeight: CERCHIO,
          }}
        >
          {/* cerchio liquid glass che scivola sotto le icone */}
          {slotW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: CERCHIO,
                height: CERCHIO,
                borderRadius: CERCHIO / 2,
                backgroundColor: "rgba(255,255,255,0.12)",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.2)",
                transform: [
                  {
                    translateX: circlePos.interpolate({
                      inputRange: [0, NUM_TAB - 1],
                      outputRange: [
                        (slotW - CERCHIO) / 2,
                        slotW * (NUM_TAB - 1) + (slotW - CERCHIO) / 2,
                      ],
                      extrapolate: "clamp",
                    }),
                  },
                  { scale: circleScale },
                ],
              }}
            />
          )}
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => premi(i)}
              activeOpacity={0.8}
              accessibilityLabel={t.label}
              accessibilityState={{ selected: tab === i }}
              style={{
                flex: 1,
                height: CERCHIO,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* icone statiche: solo crossfade di colore guidato da
                  circlePos, così si accendono al passaggio del cerchio
                  (il colore non è animabile direttamente su Fabric,
                  quindi bianca e arancione sono sovrapposte) */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Animated.View
                  style={{
                    opacity: circlePos.interpolate({
                      inputRange: [i - 1, i, i + 1],
                      outputRange: [1, 0, 1],
                      extrapolate: "clamp",
                    }),
                  }}
                >
                  <Ionicons name={t.icon} size={22} color={BIANCO_SPENTO} />
                </Animated.View>
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    opacity: circlePos.interpolate({
                      inputRange: [i - 1, i, i + 1],
                      outputRange: [0, 1, 0],
                      extrapolate: "clamp",
                    }),
                  }}
                >
                  <Ionicons name={t.icon} size={24} color={ARANCIONE} />
                </Animated.View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
