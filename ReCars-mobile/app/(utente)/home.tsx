import TouchFeedback from "@/components/TouchFeedback";
import { NAV_SPACE } from "@/components/utente/BottomNav";
import VeicoloSwitcher from "@/components/utente/VeicoloSwitcher";
import { apiFetch } from "@/constants/api";
import { NUM_TAB, useNav } from "@/constants/nav-context";
import { logoutGlobale, useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountScreen from "./account";
import CercaVeicoloScreen from "./cerca-veicolo";
import PrenotazioniScreen from "./prenotazioni";
import StoricoScreen from "./storico";

/* dettaglio del veicolo attivo mostrato nella sezione info della home
   (stesso endpoint /veicolo/:id usato da info-veicolo) */
type InfoAttivo = {
  anno?: string;
  alimentazione?: string;
  bolloAttivo: boolean;
  rcaAttiva: boolean;
};

function StatoBadge({ label, attivo }: { label: string; attivo: boolean }) {
  const colore = attivo ? "#4ade80" : "#f87171";
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: attivo
          ? "rgba(74,222,128,0.12)"
          : "rgba(248,113,113,0.12)",
        borderWidth: 1,
        borderColor: attivo ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colore,
        }}
      />
      <Text className="text-[10px] font-bold" style={{ color: colore }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Contenitore delle 5 tab: un unico pager orizzontale (pagingEnabled,
 * scroll programmatico) così lo scorrimento tra le schermate è continuo
 * come in Instagram e non si blocca mai. La pagina 0 è la home vera e
 * propria, le altre riusano le schermate delle sezioni.
 */
export default function HomeScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();
  const { tab, cambiaTab, tabIndex, pagerRef } = useNav();
  const { width } = useWindowDimensions();

  const [info, setInfo] = useState<InfoAttivo | null>(null);
  /* contatore notifiche: resta 0 finché non esiste l'endpoint dedicato,
     il badge rosso compare da solo quando arriveranno valori > 0 */
  const [notifiche] = useState(0);

  /* al cambio tab il pager scorre alla pagina corrispondente */
  useEffect(() => {
    pagerRef.current?.scrollTo({ x: tab * width, animated: true });
  }, [tab, width, pagerRef]);

  /* PanResponder globale del pager, creato una volta sola: legge lo
     stato corrente dai ref */
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const widthRef = useRef(width);
  widthRef.current = width;
  const cambiaTabRef = useRef(cambiaTab);
  cambiaTabRef.current = cambiaTab;

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        /* il contenuto segue il dito in modo continuo, senza bloccarsi */
        const max = (NUM_TAB - 1) * widthRef.current;
        const x = Math.max(
          0,
          Math.min(max, tabRef.current * widthRef.current - g.dx),
        );
        pagerRef.current?.scrollTo({ x, animated: false });
      },
      onPanResponderRelease: (_e, g) => {
        /* cambio tab al rilascio: basta superare la distanza minima
           (50px) oppure la velocità minima (0.3) */
        const dir = g.dx < 0 ? 1 : -1;
        const dest = tabRef.current + dir;
        const valido = dest >= 0 && dest < NUM_TAB;
        if (valido && (Math.abs(g.dx) >= 50 || Math.abs(g.vx) >= 0.3)) {
          cambiaTabRef.current(dest);
        } else {
          pagerRef.current?.scrollTo({
            x: tabRef.current * widthRef.current,
            animated: true,
          });
        }
      },
      onPanResponderTerminate: () => {
        pagerRef.current?.scrollTo({
          x: tabRef.current * widthRef.current,
          animated: true,
        });
      },
    }),
  ).current;

  useEffect(() => {
    if (!veicoloAttivo) {
      setInfo(null);
      return;
    }
    let annullato = false;

    async function carica() {
      try {
        const res = await apiFetch(`/veicolo/${veicoloAttivo!.id}`);
        if (res.status === 401) {
          await logoutGlobale();
          return;
        }
        if (!res.ok) return;
        const v = await res.json();
        if (annullato) return;
        const dg = v.dati_generici?.[0] ?? {};
        const ds = v.dati_specifici?.[0] ?? {};
        setInfo({
          anno: ds.dataimmatricolazione
            ? String(new Date(ds.dataimmatricolazione).getFullYear())
            : undefined,
          alimentazione: dg.alimentazione,
          bolloAttivo: !!ds.isbolloattivo,
          rcaAttiva: !!ds.isinsured,
        });
      } catch (err) {
        console.error("Errore nel caricamento info veicolo", err);
      }
    }
    carica();
    return () => {
      annullato = true;
    };
  }, [veicoloAttivo]);

  const iconaTipo = veicoloAttivo?.tipo === "motorcycle" ? "motorcycle" : "car";

  return (
    <View className="flex-1 bg-bg" {...swipePan.panHandlers}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) =>
          tabIndex.setValue(e.nativeEvent.contentOffset.x / width)
        }
        onContentSizeChange={() =>
          pagerRef.current?.scrollTo({ x: tab * width, animated: false })
        }
        style={{ flex: 1 }}
      >
        {/* pagina 0: Home */}
        <View style={{ width }}>
          <SafeAreaView
            className="flex-1 bg-bg"
            edges={["top", "left", "right"]}
          >
            {/* header: solo logo centrale e campanella, la home non ha
                indietro */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-orange/15">
              <View style={{ width: 36 }} />
              {/* sul sito il logo riporta alla home: qui siamo già in home,
                  quindi rimbalza soltanto per dare comunque risposta al tocco */}
              <TouchFeedback scaleTo={0.9} onPress={() => {}}>
                <Text className="text-xl font-extrabold text-orange tracking-widest">
                  RE|CARS
                </Text>
              </TouchFeedback>
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityLabel="Notifiche"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(249,115,22,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={17}
                  color="#f97316"
                />
                {notifiche > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      paddingHorizontal: 3,
                      backgroundColor: "#e53935",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text className="text-[9px] font-bold text-white">
                      {notifiche}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* switcher unificato in un unico pill centrale */}
            <View className="py-3 border-b border-white/5">
              <VeicoloSwitcher
                veicoli={veicoli}
                veicoloAttivo={veicoloAttivo}
                onSeleziona={seleziona}
                onAggiungi={() => cambiaTab(1)}
                onElimina={elimina}
              />
            </View>

            {/* contenuto principale: mai nascosto dal pill flottante */}
            <View
              className="flex-1 px-4 pt-4"
              style={{ paddingBottom: NAV_SPACE }}
            >
              {veicoloAttivo ? (
                /* info del veicolo attivo */
                <View
                  className="rounded-2xl p-4 gap-3"
                  style={{
                    backgroundColor: "#141445",
                    borderWidth: 0.5,
                    borderColor: "rgba(249,115,22,0.25)",
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="items-center justify-center rounded-2xl"
                      style={{
                        width: 52,
                        height: 52,
                        backgroundColor: "rgba(249,115,22,0.12)",
                        borderWidth: 1.5,
                        borderColor: "rgba(249,115,22,0.35)",
                      }}
                    >
                      <FontAwesome6
                        name={iconaTipo}
                        size={22}
                        color="#f97316"
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text
                        className="text-base font-extrabold text-white"
                        numberOfLines={1}
                      >
                        {veicoloAttivo.nome}
                      </Text>
                      <View
                        className="self-start rounded-md px-2 py-0.5"
                        style={{
                          backgroundColor: "rgba(249,115,22,0.15)",
                          borderWidth: 1,
                          borderColor: "rgba(249,115,22,0.4)",
                        }}
                      >
                        <Text className="text-[10px] font-bold text-orange tracking-widest">
                          {veicoloAttivo.targa}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5">
                    <View className="bg-white/5 rounded-md px-2 py-1">
                      <Text className="text-[10px] text-white/50">
                        Anno{" "}
                        <Text className="font-bold text-white/80">
                          {info?.anno ?? "-"}
                        </Text>
                      </Text>
                    </View>
                    <View className="bg-white/5 rounded-md px-2 py-1">
                      <Text className="text-[10px] text-white/50">
                        Alimentazione{" "}
                        <Text className="font-bold text-white/80">
                          {info?.alimentazione ?? "-"}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    <StatoBadge
                      label={
                        info?.bolloAttivo ? "Bollo attivo" : "Bollo scaduto"
                      }
                      attivo={!!info?.bolloAttivo}
                    />
                    <StatoBadge
                      label={info?.rcaAttiva ? "RCA attiva" : "RCA scaduta"}
                      attivo={!!info?.rcaAttiva}
                    />
                  </View>
                </View>
              ) : (
                /* nessun veicolo: invito ad aggiungere il primo */
                <View className="items-center gap-2 px-8 pt-6">
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: "rgba(249,115,22,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.3)",
                    }}
                  >
                    <Ionicons
                      name="car-sport-outline"
                      size={28}
                      color="#f97316"
                    />
                  </View>
                  <Text className="text-base font-bold text-white text-center mt-1">
                    Aggiungi il tuo primo veicolo
                  </Text>
                  <Text className="text-sm text-muted text-center leading-5">
                    Cercalo per targa dal tab Cerca della barra qui sotto.
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>

        {/* pagine 1-4: le sezioni riusate come tab */}
        <View style={{ width }}>
          <CercaVeicoloScreen />
        </View>
        <View style={{ width }}>
          <PrenotazioniScreen />
        </View>
        <View style={{ width }}>
          <StoricoScreen />
        </View>
        <View style={{ width }}>
          <AccountScreen />
        </View>
      </ScrollView>
    </View>
  );
}
