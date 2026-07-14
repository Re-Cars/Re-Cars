import TouchFeedback from "@/components/TouchFeedback";
import { NAV_SPACE } from "@/components/utente/BottomNav";
import VeicoloSwitcher from "@/components/utente/VeicoloSwitcher";
import { Veicolo } from "@/constants/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  /* nome della sezione, tenuto per i chiamanti anche se l'header non
     mostra più il percorso di navigazione */
  titolo?: string;
  children: ReactNode;
  /* se passati, mostra la riga switcher come le pagine web */
  veicoli?: Veicolo[];
  veicoloAttivo?: Veicolo | null;
  onSeleziona?: (v: Veicolo) => void;
  onElimina?: (id: number) => Promise<boolean>;
  scroll?: boolean;
};

/**
 * Struttura comune delle sezioni utente: header identico alla home
 * (logo centrale e campanella notifiche) e pill switcher centrale.
 * Non c'è navigazione indietro esplicita: si torna con lo swipe
 * orizzontale globale o con la bottom nav.
 */
export default function SectionScreen({
  children,
  veicoli,
  veicoloAttivo,
  onSeleziona,
  onElimina,
  scroll = true,
}: Props) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* header come la home: solo logo centrale e campanella */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-orange/15">
        <View style={{ width: 36 }} />
        {/* come sul sito: il logo riporta alla homepage */}
        <TouchFeedback
          onPress={() => router.replace("/(utente)/home")}
          scaleTo={0.9}
        >
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
          <Ionicons name="notifications-outline" size={17} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* switcher unificato */}
      {veicoli && onSeleziona && (
        <View className="py-2.5 border-b border-white/5">
          <VeicoloSwitcher
            veicoli={veicoli}
            veicoloAttivo={veicoloAttivo ?? null}
            onSeleziona={onSeleziona}
            onAggiungi={() => router.push("/(utente)/cerca-veicolo")}
            onElimina={onElimina}
          />
        </View>
      )}

      <Body
        className="flex-1"
        {...(scroll
          ? {
              /* il fondo resta libero dal pill di navigazione flottante */
              contentContainerStyle: { padding: 16, paddingBottom: NAV_SPACE },
              /* senza "handled" il primo tap con tastiera aperta viene
                 consumato solo per chiudere la tastiera (vedi login web/app) */
              keyboardShouldPersistTaps: "handled" as const,
            }
          : { style: { flex: 1, padding: 16, paddingBottom: NAV_SPACE } })}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}
