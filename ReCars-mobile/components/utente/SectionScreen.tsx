import TouchFeedback from "@/components/TouchFeedback";
import MenuLaterale from "@/components/utente/MenuLaterale";
import VeicoloSwitcher from "@/components/utente/VeicoloSwitcher";
import { Veicolo } from "@/constants/api";
import { FontAwesome6 } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  titolo: string;
  children: ReactNode;
  /* se passati, mostra la riga switcher come le pagine web */
  veicoli?: Veicolo[];
  veicoloAttivo?: Veicolo | null;
  onSeleziona?: (v: Veicolo) => void;
  onElimina?: (id: number) => Promise<boolean>;
  scroll?: boolean;
};

/**
 * Struttura comune delle sezioni utente: header con hamburger + brand,
 * breadcrumb e pill switcher centrale (come header/breadcrumb/home-intro web).
 * Per tornare indietro restano il link Home del breadcrumb, il logo e lo
 * swipe-back nativo dello stack.
 */
export default function SectionScreen({
  titolo,
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
      {/* header: hamburger globale come sul sito, dove hamburger9 e
          sidebar sono presenti in tutte le pagine dell'area utente */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-orange/15">
        <MenuLaterale />
        {/* come sul sito: il logo riporta alla homepage */}
        <TouchFeedback
          onPress={() => router.replace("/(utente)/home")}
          scaleTo={0.9}
        >
          <Text className="text-xl font-extrabold text-orange tracking-widest">
            RE|CARS
          </Text>
        </TouchFeedback>
        <View style={{ width: 30 }} />
      </View>

      {/* breadcrumb */}
      <View className="flex-row items-center gap-2 px-4 py-2 border-b border-orange/10">
        <TouchFeedback
          onPress={() => router.replace("/(utente)/home")}
          hitSlop={6}
          scaleTo={0.92}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginLeft: -6,
            borderRadius: 6,
          }}
          pressedStyle={{ backgroundColor: "rgba(249,115,22,0.16)" }}
        >
          <FontAwesome6 name="house" size={9} color="#f97316" />
          <Text className="text-xs text-orange">Home</Text>
        </TouchFeedback>
        <Text className="text-xs text-muted">›</Text>
        <Text className="text-xs text-muted">{titolo}</Text>
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
              contentContainerStyle: { padding: 16, paddingBottom: 40 },
              /* senza "handled" il primo tap con tastiera aperta viene
                 consumato solo per chiudere la tastiera (vedi login web/app) */
              keyboardShouldPersistTaps: "handled" as const,
            }
          : { style: { flex: 1, padding: 16 } })}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}
