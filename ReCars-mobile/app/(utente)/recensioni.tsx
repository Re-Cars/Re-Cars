import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Recensione = { id: number; voto: number; testo: string; data: string };

export default function RecensioniScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [voto, setVoto] = useState(0);
  const [testo, setTesto] = useState("");
  const [errore, setErrore] = useState("");
  const [recensioni, setRecensioni] = useState<Recensione[]>([]);

  function invia() {
    setErrore("");
    if (voto === 0) {
      setErrore("Seleziona un voto da 1 a 5 stelle.");
      return;
    }
    if (!testo.trim()) {
      setErrore("Scrivi la tua recensione prima di inviare.");
      return;
    }
    setRecensioni((prev) => [
      {
        id: prev.length + 1,
        voto,
        testo: testo.trim(),
        data: new Date().toLocaleDateString("it-IT"),
      },
      ...prev,
    ]);
    setVoto(0);
    setTesto("");
  }

  return (
    <SectionScreen
      titolo="Recensioni"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      <Text className="text-xl font-bold text-orange text-center mb-4">
        Recensioni
      </Text>

      {/* lascia una recensione */}
      <View
        className="rounded-2xl p-5 gap-3.5"
        style={{
          backgroundColor: "#141445",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.2)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="pen-to-square" size={13} color="#f26f21" />
          <Text className="text-base font-bold" style={{ color: "#f26f21" }}>
            Lascia una Recensione
          </Text>
        </View>
        <Text className="text-xs text-white/50 leading-4">
          Puoi recensire solo le officine dove hai prenotato.
        </Text>

        <View className="flex-row items-center gap-3">
          <Text className="text-sm text-white">Voto:</Text>
          <View className="flex-row gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setVoto(n)} hitSlop={4}>
                <FontAwesome6
                  name="star"
                  size={20}
                  solid
                  color={n <= voto ? "#f97316" : "rgba(255,255,255,0.2)"}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          className="flex-row items-start gap-3 rounded-xl px-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <View style={{ paddingTop: 14 }}>
            <FontAwesome6 name="comment" size={13} color="#f97316" />
          </View>
          <TextInput
            value={testo}
            onChangeText={setTesto}
            placeholder="Scrivi la tua recensione..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            numberOfLines={4}
            className="flex-1 text-white text-sm py-3"
            style={{ minHeight: 90, textAlignVertical: "top" }}
          />
        </View>

        {errore !== "" && (
          <Text className="text-xs" style={{ color: "#ff6b6b" }}>
            {errore}
          </Text>
        )}

        <TouchableOpacity
          onPress={invia}
          activeOpacity={0.8}
          className="self-center flex-row items-center gap-2 rounded-full px-7 py-2.5"
          style={{ backgroundColor: "#f97316" }}
        >
          <FontAwesome6 name="paper-plane" size={12} color="#fff" />
          <Text className="text-sm font-bold text-white">
            Invia Recensione
          </Text>
        </TouchableOpacity>
      </View>

      {/* le tue recensioni */}
      <View
        className="rounded-2xl p-5 gap-3 mt-4"
        style={{
          backgroundColor: "#141445",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.2)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="star-half-stroke" size={13} color="#f26f21" />
          <Text className="text-base font-bold" style={{ color: "#f26f21" }}>
            Le tue Recensioni
          </Text>
        </View>
        {recensioni.length === 0 ? (
          <Text className="text-sm text-white/50">
            Non hai ancora lasciato recensioni.
          </Text>
        ) : (
          recensioni.map((r) => (
            <View
              key={r.id}
              className="rounded-xl p-3.5 gap-1.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FontAwesome6
                      key={n}
                      name="star"
                      size={11}
                      solid
                      color={n <= r.voto ? "#f97316" : "rgba(255,255,255,0.15)"}
                    />
                  ))}
                </View>
                <Text className="text-[10px] text-white/35">{r.data}</Text>
              </View>
              <Text className="text-xs text-white/70 leading-4">{r.testo}</Text>
            </View>
          ))
        )}
      </View>
    </SectionScreen>
  );
}
