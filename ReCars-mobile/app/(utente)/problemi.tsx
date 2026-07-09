import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

const CATEGORIE = ["Motore", "Freni", "Elettrico", "Carrozzeria", "Gomme", "Altro"];

type Problema = {
  id: number;
  veicolo: string;
  data: string;
  categoria: string;
  descrizione: string;
};

export default function ProblemiScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [errore, setErrore] = useState("");
  const [problemi, setProblemi] = useState<Problema[]>([]);

  function aggiungi() {
    setErrore("");
    if (!veicoloAttivo) {
      setErrore("Nessun veicolo attivo: aggiungine uno al garage.");
      return;
    }
    if (!categoria || !descrizione.trim()) {
      setErrore("Categoria e descrizione sono obbligatorie.");
      return;
    }
    setProblemi((prev) => [
      {
        id: prev.length + 1,
        veicolo: veicoloAttivo.nome,
        data,
        categoria,
        descrizione: descrizione.trim(),
      },
      ...prev,
    ]);
    setCategoria("");
    setDescrizione("");
  }

  return (
    <SectionScreen
      titolo="Diario Problemi"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      <Text className="text-xl font-bold text-orange text-center mb-4">
        Diario Problemi
      </Text>

      {/* segnala un problema */}
      <View
        className="rounded-2xl p-5 gap-3.5"
        style={{
          backgroundColor: "#141445",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.2)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="triangle-exclamation" size={13} color="#f26f21" />
          <Text className="text-base font-bold" style={{ color: "#f26f21" }}>
            Segnala un Problema
          </Text>
        </View>

        <View
          className="flex-row items-center gap-3 rounded-xl px-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <FontAwesome6 name="calendar" size={13} color="#f97316" />
          <TextInput
            value={data}
            onChangeText={setData}
            placeholder="AAAA-MM-GG"
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="flex-1 text-white text-sm py-3"
          />
        </View>

        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <FontAwesome6 name="tag" size={11} color="#f97316" />
            <Text className="text-xs text-muted">Categoria</Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {CATEGORIE.map((c) => {
              const sel = categoria === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategoria(c)}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: sel
                      ? "rgba(249,115,22,0.2)"
                      : "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: sel ? "#f97316" : "rgba(255,255,255,0.1)",
                  }}
                >
                  <Text
                    className="text-xs"
                    style={{ color: sel ? "#f97316" : "#a0a8b8" }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
            <FontAwesome6 name="pen" size={12} color="#f97316" />
          </View>
          <TextInput
            value={descrizione}
            onChangeText={setDescrizione}
            placeholder="Descrivi il problema..."
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
          onPress={aggiungi}
          activeOpacity={0.8}
          className="self-center flex-row items-center gap-2 rounded-full px-7 py-2.5"
          style={{ backgroundColor: "#f97316" }}
        >
          <FontAwesome6 name="plus" size={12} color="#fff" />
          <Text className="text-sm font-bold text-white">Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {/* diario */}
      <View
        className="rounded-2xl p-5 gap-3 mt-4"
        style={{
          backgroundColor: "#141445",
          borderWidth: 1,
          borderColor: "rgba(249,115,22,0.2)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="book" size={13} color="#f26f21" />
          <Text className="text-base font-bold" style={{ color: "#f26f21" }}>
            Diario Problemi
          </Text>
        </View>
        {problemi.length === 0 ? (
          <Text className="text-sm text-white/50">
            Nessun problema segnalato.
          </Text>
        ) : (
          problemi.map((p) => (
            <View
              key={p.id}
              className="rounded-xl p-3.5 gap-1"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.08)",
                borderLeftWidth: 3,
                borderLeftColor: "#d14019",
              }}
            >
              <View className="flex-row items-center justify-between">
                <View
                  className="rounded-md px-2 py-0.5"
                  style={{ backgroundColor: "rgba(209,64,25,0.2)" }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: "#f87171" }}
                  >
                    {p.categoria}
                  </Text>
                </View>
                <Text className="text-[10px] text-white/35">{p.data}</Text>
              </View>
              <Text className="text-xs font-semibold text-white/70">
                {p.veicolo}
              </Text>
              <Text className="text-xs text-white/60 leading-4">
                {p.descrizione}
              </Text>
            </View>
          ))
        )}
      </View>
    </SectionScreen>
  );
}
