import SectionScreen from "@/components/utente/SectionScreen";
import { useVeicoli } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/* categorie e tipi come functions-storico.js del frontend web */
const TIPI_INTERVENTO: Record<string, string[]> = {
  ordinario: [
    "Cambio olio",
    "Cambio tergicristalli",
    "Gomme",
    "Batteria",
    "Controllo livelli",
    "Pastiglie freni",
    "Liquido freni",
    "Liquido raffreddamento",
    "Filtri motore",
    "Pulizia iniettori",
    "Tagliando",
    "Altro",
  ],
  straordinario: [
    "Cinghia distribuzione",
    "Carrozzeria",
    "Riparazioni",
    "Impianto elettrico",
    "Luci",
    "Frizione",
    "Ammortizzatori",
    "Radiatore",
    "Sensori",
    "Compressore clima",
    "Marmitta",
    "Altro",
  ],
  gestione: ["Assicurazione", "Bollo", "Revisione", "Multa", "Pedaggi", "Parcheggio"],
  annotazioni: ["Problemi", "Luci", "Motore", "Elettrico", "Rumori", "Altro"],
};

const COLORI_CATEGORIA: Record<string, string> = {
  ordinario: "#2b88b8",
  straordinario: "#ef4444",
  annotazioni: "#f8782f",
  gestione: "#22c55e",
};

const FILTRI = [
  { key: "all", label: "Tutti" },
  { key: "ordinario", label: "Ordinario" },
  { key: "straordinario", label: "Straordinario" },
  { key: "annotazioni", label: "Annotazioni" },
  { key: "gestione", label: "Spese di gestione" },
] as const;

type Intervento = {
  id: number;
  data: string;
  categoria: string;
  nome: string;
  descrizione: string | null;
  mediante: string | null;
  costo: number | null;
};

const INTERVENTI_INIZIALI: Intervento[] = [
  {
    id: 1,
    data: "2026-01-15",
    categoria: "ordinario",
    nome: "Cambio olio",
    descrizione: "cambio olio motore",
    mediante: "Officina Rossi",
    costo: 60,
  },
  {
    id: 2,
    data: "2026-02-20",
    categoria: "ordinario",
    nome: "Cambio tergicristalli",
    descrizione: "sostituzione tergicristalli",
    mediante: null,
    costo: 25,
  },
  {
    id: 3,
    data: "2026-03-10",
    categoria: "straordinario",
    nome: "Cinghia distribuzione",
    descrizione: "rottura cinghia",
    mediante: "Autofficina Bianchi",
    costo: 350,
  },
  {
    id: 4,
    data: "2026-04-01",
    categoria: "gestione",
    nome: "Assicurazione",
    descrizione: "rinnovo assicurazione",
    mediante: null,
    costo: 600,
  },
  {
    id: 5,
    data: "2026-04-22",
    categoria: "ordinario",
    nome: "Gomme",
    descrizione: "cambio gomme stagionali",
    mediante: "Gommista Ferrari",
    costo: 200,
  },
];

function catLabel(cat: string) {
  if (cat === "gestione") return "Spese di gestione";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function StoricoScreen() {
  const { veicoli, veicoloAttivo, seleziona, elimina } = useVeicoli();

  const [interventi, setInterventi] = useState<Intervento[]>(INTERVENTI_INIZIALI);
  const [filtro, setFiltro] = useState<string>("all");
  const [modalAperto, setModalAperto] = useState(false);
  const [daEliminare, setDaEliminare] = useState<Intervento | null>(null);

  // form nuovo intervento
  const [formData, setFormData] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formDescrizione, setFormDescrizione] = useState("");
  const [formMediante, setFormMediante] = useState("");
  const [formCosto, setFormCosto] = useState("");
  const [formErrore, setFormErrore] = useState("");

  const filtrati =
    filtro === "all"
      ? interventi
      : interventi.filter((i) => i.categoria === filtro);

  function apriModal() {
    setFormData(new Date().toISOString().split("T")[0]);
    setFormCategoria("");
    setFormNome("");
    setFormDescrizione("");
    setFormMediante("");
    setFormCosto("");
    setFormErrore("");
    setModalAperto(true);
  }

  function salvaIntervento() {
    if (!formData || !formCategoria || !formNome) {
      setFormErrore("Data, categoria e tipo intervento sono obbligatori.");
      return;
    }
    setInterventi((prev) => [
      {
        id: Math.max(0, ...prev.map((i) => i.id)) + 1,
        data: formData,
        categoria: formCategoria,
        nome: formNome,
        descrizione: formDescrizione.trim() || null,
        mediante: formMediante.trim() || null,
        costo: parseFloat(formCosto) || null,
      },
      ...prev,
    ]);
    setModalAperto(false);
  }

  return (
    <SectionScreen
      titolo="Storico Interventi"
      veicoli={veicoli}
      veicoloAttivo={veicoloAttivo}
      onSeleziona={seleziona}
      onElimina={elimina}
    >
      {/* barra titolo + contatore */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-extrabold text-white tracking-wider">
          STORICO INTERVENTI
        </Text>
        <View className="bg-orange/15 border border-orange/40 rounded-full px-2.5 py-0.5">
          <Text className="text-[10px] font-bold text-orange">
            {filtrati.length} intervent{filtrati.length === 1 ? "o" : "i"}
          </Text>
        </View>
      </View>

      {/* filtri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerStyle={{ gap: 6 }}
      >
        {FILTRI.map((f) => {
          const attivo = filtro === f.key;
          const colore =
            f.key === "all" ? "#f97316" : COLORI_CATEGORIA[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFiltro(f.key)}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: attivo ? `${colore}30` : "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: attivo ? colore : "rgba(255,255,255,0.1)",
              }}
            >
              {f.key !== "all" && (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: COLORI_CATEGORIA[f.key],
                  }}
                />
              )}
              <Text
                className="text-xs font-semibold"
                style={{ color: attivo ? colore : "#a0a8b8" }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* lista interventi */}
      {filtrati.length === 0 ? (
        <Text className="text-xs text-muted text-center py-8">
          Nessun intervento trovato per questa categoria.
        </Text>
      ) : (
        <View className="gap-2.5">
          {filtrati.map((item) => {
            const colore = COLORI_CATEGORIA[item.categoria] ?? "#f97316";
            return (
              <View
                key={item.id}
                className="rounded-2xl p-3.5"
                style={{
                  backgroundColor: "#141445",
                  borderWidth: 0.5,
                  borderColor: "rgba(255,255,255,0.08)",
                  borderLeftWidth: 3,
                  borderLeftColor: colore,
                }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colore,
                      }}
                    />
                    <Text className="text-[11px] text-white/50">
                      {item.data}
                    </Text>
                    <View
                      className="rounded-md px-2 py-0.5"
                      style={{ backgroundColor: `${colore}22` }}
                    >
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: colore }}
                      >
                        {catLabel(item.categoria)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDaEliminare(item)}
                    hitSlop={8}
                  >
                    <FontAwesome6
                      name="trash"
                      size={12}
                      color="rgba(255,107,107,0.6)"
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-sm font-semibold text-white">
                  {item.nome}
                </Text>
                {item.descrizione && (
                  <Text className="text-xs text-white/45 mt-0.5">
                    {item.descrizione}
                  </Text>
                )}
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-[11px] text-white/40">
                    {item.mediante ?? "—"}
                  </Text>
                  <Text className="text-xs font-bold text-orange">
                    {item.costo != null ? `${item.costo.toFixed(2)} €` : "—"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* bottone aggiungi */}
      <View className="flex-row items-center justify-end gap-3 mt-5">
        <Text className="text-xs italic text-muted text-right">
          aggiungi{"\n"}intervento!
        </Text>
        <TouchableOpacity
          onPress={apriModal}
          activeOpacity={0.8}
          className="w-14 h-14 rounded-full bg-orange items-center justify-center"
        >
          <FontAwesome6 name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* modal nuovo intervento */}
      <Modal
        visible={modalAperto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAperto(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "#141445",
              borderWidth: 0.5,
              borderColor: "rgba(249,115,22,0.3)",
            }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <FontAwesome6 name="plus" size={14} color="#f26f21" />
              <Text className="text-base font-bold text-white">
                Nuovo intervento
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text className="text-xs text-muted mb-1">Data</Text>
              <TextInput
                value={formData}
                onChangeText={setFormData}
                placeholder="AAAA-MM-GG"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm mb-3"
              />

              <Text className="text-xs text-muted mb-1">Categoria</Text>
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                {Object.keys(TIPI_INTERVENTO).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setFormCategoria(cat);
                      setFormNome("");
                    }}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor:
                        formCategoria === cat
                          ? `${COLORI_CATEGORIA[cat]}30`
                          : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor:
                        formCategoria === cat
                          ? COLORI_CATEGORIA[cat]
                          : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color:
                          formCategoria === cat
                            ? COLORI_CATEGORIA[cat]
                            : "#a0a8b8",
                      }}
                    >
                      {catLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs text-muted mb-1">Tipo intervento</Text>
              {formCategoria === "" ? (
                <Text className="text-xs text-white/30 mb-3">
                  Prima seleziona categoria...
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {TIPI_INTERVENTO[formCategoria].map((nome) => (
                    <TouchableOpacity
                      key={nome}
                      onPress={() => setFormNome(nome)}
                      className="rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor:
                          formNome === nome
                            ? "rgba(249,115,22,0.2)"
                            : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor:
                          formNome === nome
                            ? "#f97316"
                            : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <Text
                        className="text-xs"
                        style={{
                          color: formNome === nome ? "#f97316" : "#a0a8b8",
                        }}
                      >
                        {nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text className="text-xs text-muted mb-1">
                Descrizione (opzionale)
              </Text>
              <TextInput
                value={formDescrizione}
                onChangeText={setFormDescrizione}
                placeholder="es. cambio olio motore 5W30"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm mb-3"
              />

              <View className="flex-row gap-3 mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">
                    Mediante (opzionale)
                  </Text>
                  <TextInput
                    value={formMediante}
                    onChangeText={setFormMediante}
                    placeholder="es. officina"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">
                    Costo (opzionale)
                  </Text>
                  <TextInput
                    value={formCosto}
                    onChangeText={setFormCosto}
                    placeholder="€ 0.00"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="decimal-pad"
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </View>
              </View>
            </ScrollView>

            {formErrore !== "" && (
              <Text className="text-xs mt-2" style={{ color: "#ff6b6b" }}>
                {formErrore}
              </Text>
            )}

            <View className="flex-row gap-2.5 mt-4">
              <TouchableOpacity
                onPress={() => setModalAperto(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 items-center"
              >
                <Text className="text-sm font-semibold text-muted">
                  Cancella
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={salvaIntervento}
                className="flex-1 py-2.5 rounded-xl bg-orange items-center"
              >
                <Text className="text-sm font-bold text-white">Salva</Text>
              </TouchableOpacity>
            </View>
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
            className="rounded-2xl p-6 items-center gap-2.5"
            style={{
              backgroundColor: "#141445",
              width: "85%",
              maxWidth: 320,
              borderWidth: 1,
              borderColor: "rgba(255,107,107,0.2)",
            }}
          >
            <FontAwesome6
              name="triangle-exclamation"
              size={22}
              color="#ff6b6b"
            />
            <Text className="text-base font-bold text-white">
              Elimina intervento
            </Text>
            <Text className="text-sm text-muted text-center">
              Eliminare &quot;{daEliminare?.nome}&quot;?
            </Text>
            <View className="flex-row gap-2.5 w-full mt-2">
              <TouchableOpacity
                onPress={() => setDaEliminare(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 items-center"
              >
                <Text className="text-sm font-semibold text-muted">
                  Annulla
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setInterventi((prev) =>
                    prev.filter((i) => i.id !== daEliminare?.id),
                  );
                  setDaEliminare(null);
                }}
                className="flex-1 py-2.5 rounded-xl items-center"
                style={{ backgroundColor: "#ff6b6b" }}
              >
                <Text className="text-sm font-bold text-white">Elimina</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SectionScreen>
  );
}
