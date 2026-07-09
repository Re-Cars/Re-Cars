import TouchFeedback from "@/components/TouchFeedback";
import { Veicolo } from "@/constants/api";
import { FontAwesome6 } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  veicoli: Veicolo[];
  veicoloAttivo: Veicolo | null;
  onSeleziona: (v: Veicolo) => void;
  onAggiungi: () => void;
  onElimina?: (id: number) => Promise<boolean>;
};

/**
 * Switcher unificato in un unico pill centrale (versione responsive del
 * frontend web): veicolo attivo + targa + contatore garage + chevron.
 * Il dropdown web diventa un bottom sheet.
 */
export default function VeicoloSwitcher({
  veicoli,
  veicoloAttivo,
  onSeleziona,
  onAggiungi,
  onElimina,
}: Props) {
  const [aperto, setAperto] = useState(false);
  const [daEliminare, setDaEliminare] = useState<Veicolo | null>(null);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [borderAnim]);

  const iconaTipo = veicoloAttivo?.tipo === "motorcycle" ? "motorcycle" : "car";

  return (
    <>
      {/* pill unificato centrale */}
      <TouchFeedback
        onPress={() => setAperto(true)}
        scaleTo={0.95}
        style={{
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "rgba(249,115,22,0.1)",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.4)",
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 6,
        }}
        pressedStyle={{
          backgroundColor: "rgba(249,115,22,0.22)",
          borderColor: "rgba(249,115,22,0.8)",
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
        <FontAwesome6
          name={aperto ? "chevron-up" : "chevron-down"}
          size={9}
          color="#f97316"
        />
      </TouchFeedback>

      {/* bottom sheet garage */}
      <Modal
        visible={aperto}
        transparent
        animationType="slide"
        onRequestClose={() => setAperto(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setAperto(false)}
        />
        <View
          style={{
            backgroundColor: "#141445",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0.5,
            borderColor: "rgba(249,115,22,0.3)",
            padding: 16,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              width: 36,
              height: 3,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <View className="flex-row items-center gap-2 mb-3">
            <FontAwesome6 name="warehouse" size={12} color="#f97316" />
            <Text className="text-xs font-semibold text-muted uppercase tracking-widest">
              I tuoi veicoli
            </Text>
          </View>
          <FlatList
            data={veicoli}
            keyExtractor={(v) => String(v.id)}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => {
              const attivo = item.id === veicoloAttivo?.id;
              return (
                <TouchFeedback
                  onPress={() => {
                    onSeleziona(item);
                    setAperto(false);
                  }}
                  scaleTo={0.96}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 6,
                    backgroundColor: attivo
                      ? "rgba(249,115,22,0.12)"
                      : "transparent",
                    borderWidth: attivo ? 0.5 : 0,
                    borderColor: "rgba(249,115,22,0.3)",
                  }}
                  pressedStyle={{ backgroundColor: "rgba(249,115,22,0.2)" }}
                >
                  <View className="w-7 h-7 rounded-lg bg-orange/10 items-center justify-center">
                    <FontAwesome6
                      name={item.tipo === "motorcycle" ? "motorcycle" : "car"}
                      size={13}
                      color="#f97316"
                    />
                  </View>
                  <Text
                    className={`flex-1 text-xs font-semibold ${attivo ? "text-orange" : "text-white"}`}
                    numberOfLines={1}
                  >
                    {item.nome}
                  </Text>
                  <View className="bg-orange/15 border border-orange rounded px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-orange tracking-widest">
                      {item.targa}
                    </Text>
                  </View>
                  {onElimina && (
                    <TouchFeedback
                      onPress={() => setDaEliminare(item)}
                      hitSlop={8}
                      scaleTo={0.8}
                      style={{ padding: 4 }}
                    >
                      {({ pressed }) => (
                        <FontAwesome6
                          name="trash"
                          size={12}
                          color={
                            pressed ? "#ff6b6b" : "rgba(255,107,107,0.6)"
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

          {/* aggiungi veicolo, stesso stile del web */}
          <View
            style={{
              borderTopWidth: 0.5,
              borderColor: "rgba(249,115,22,0.15)",
              marginTop: 8,
              paddingTop: 12,
              alignItems: "center",
            }}
          >
            <Animated.View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: borderAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    "rgba(249,115,22,0.3)",
                    "rgba(249,115,22,0.9)",
                    "rgba(249,115,22,0.3)",
                  ],
                }),
                shadowColor: "#f97316",
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 10,
                shadowOpacity: borderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.7],
                }) as any,
              }}
            >
              <TouchFeedback
                onPress={() => {
                  setAperto(false);
                  onAggiungi();
                }}
                haptic="medium"
                scaleTo={0.94}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 23,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  backgroundColor: "rgba(249,115,22,0.08)",
                }}
                pressedStyle={{ backgroundColor: "rgba(249,115,22,0.22)" }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#f97316",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome6 name="plus" size={10} color="#fff" />
                </View>
                <Text
                  style={{ color: "#f97316", fontSize: 12, fontWeight: "700" }}
                >
                  Aggiungi veicolo
                </Text>
              </TouchFeedback>
            </Animated.View>
          </View>
        </View>
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
                  if (v && onElimina) await onElimina(v.id);
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
